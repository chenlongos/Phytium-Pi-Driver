# 6.6 net_device 实现

### 飞腾派 net_device API 调用表

飞腾派（Phytium Pi）网卡设备驱动（Fxmac）提供以下 API，用于初始化、配置 PHY、处理中断和数据传输。API 基于 fxmac.rs、fxmac_phy.rs、fxmac_intr.rs 等文件，适配 Fxmac 控制器（基址 0x3200_C000/0x3200_E000）和 YT8521 PHY（SGMII 接口）。表中列出函数名、参数、返回值和功能描述。

| **函数名**                   | **参数**                                                     | **返回值**                        | **功能描述**                                                 |
| ---------------------------- | ------------------------------------------------------------ | --------------------------------- | ------------------------------------------------------------ |
| `FXmacPhyInit`               | `instance_p: &mut FXmac` - Fxmac 实例。 `phy_addr: u32` - PHY 地址。 | `u32` - 0（成功），非 0（失败）。 | 初始化 YT8521 PHY，配置默认速率和自协商，通过 MDIO 接口设置寄存器。 |
| `FXmacPhyRead`               | `instance_p: &mut FXmac` - Fxmac 实例。 `phy_addr: u32` - PHY 地址。 `reg_addr: u32` - 寄存器地址。 `data: &mut u16` - 数据指针。 | `u32` - 0（成功），非 0（失败）。 | 通过 MDIO 接口读取 YT8521 寄存器（如 Status 0x01）。         |
| `FXmacPhyWrite`              | `instance_p: &mut FXmac` - Fxmac 实例。 `phy_addr: u32` - PHY 地址。 `reg_addr: u32` - 寄存器地址。 `data: u16` - 写入数据。 | `u32` - 0（成功），非 0（失败）。 | 通过 MDIO 接口写入 YT8521 寄存器（如 Control 0x00）。        |
| `phy_link_detect`            | `xmac_p: &mut FXmac` - Fxmac 实例。 `phy_addr: u32` - PHY 地址。 | `u32` - 1（连接），0（断开）。    | 读取 Status 寄存器（0x01）检测链路状态（bit 2）。            |
| `phy_autoneg_status`         | `xmac_p: &mut FXmac` - Fxmac 实例。 `phy_addr: u32` - PHY 地址。 | `u32` - 1（完成），0（未完成）。  | 读取 Status 寄存器（0x01）检查自协商状态（bit 5）。          |
| `FXmacConfigureIeeePhySpeed` | `instance_p: &mut FXmac` - Fxmac 实例。 `phy_addr: u32` - PHY 地址。 `speed: u32` - 速率（10/100/1000）。 `duplex_mode: u32` - 双工模式（0=半双工，1=全双工）。 | `u32` - 0（成功），非 0（失败）。 | 配置 YT8521 速率和双工模式，禁用自协商，更新 Control 寄存器和 NET_CFG。 |
| `FXmacSetupIsr`              | `instance: &mut FXmac` - Fxmac 实例。                        | 无                                | 设置中断处理程序，注册 TX/RX/Error/LinkChange 处理函数，通过 `dma_request_irq` 分配 IRQ。 |
| `FXmacRecvIsrHandler`        | `instance: &mut FXmac` - Fxmac 实例。                        | 无                                | 处理接收中断，更新 `recv_flg`，调用 `ethernetif_input_to_recv_packets` 处理数据。 |
| `FXmacHandleDmaTxError`      | `instance_p: &mut FXmac` - Fxmac 实例。                      | 无                                | 处理 DMA 发送错误，重置 TX 队列和描述符。                    |

## 代码实现讲解

YT8521 驱动实现位于 fxmac_phy.rs，与 Fxmac 控制器（fxmac.rs）协同，通过 MDIO 接口操作 YT8521 的 MII 寄存器（如 Control 0x00, Status 0x01）。代码依赖 fxmac_const.rs 和 mii_const.rs 的常量，支持初始化、速率配置和中断处理。以下从初始化、MDIO 操作到中断逻辑逐一讲解，结合飞腾派 D2000 硬件（双网口，SGMII 接口）。

### 初始化与配置实现

初始化通过 FXmacPhyInit 启动，配置默认参数，并调用 FXmacConfigureIeeePhySpeed 设置速率和双工。

- **FXmacPhyInit**：设置 PHY 地址（phy_addr），调用 FXmacConfigureIeeePhySpeed 配置 1000 Mbps 全双工和自协商。更新 instance_p.config.speed 和 instance_p.config.duplex，返回 FT_SUCCESS（0）。
- **FXmacConfigureIeeePhySpeed**：写入 Auto-Negotiation 寄存器（0x04），设置支持 10/100 Mbps 全/半双工。读取/修改 Control 寄存器（0x00），清除速率位（PHY_CONTROL_LINKSPEED_1000M 等）和自协商位（PHY_CONTROL_AUTONEGOTIATE_ENABLE），根据 speed 和 duplex_mode 设置新值。延迟 1500 ms 稳定 PHY，读取 Specific Status 寄存器（0x11）更新配置，返回 FT_SUCCESS。飞腾派应用：配置 YT8521 为 100 Mbps 全双工，匹配 SGMII 接口。

### MDIO 操作实现

MDIO 接口通过 PHY_MGMT 寄存器（偏移 0x034）访问 YT8521 寄存器，支持读写操作。

- **FXmacPhyRead**：使用 PHY_MGMT 设置 PHY 地址（phy_addr）和寄存器地址（reg_addr），读取数据存入 data（u16）。返回 FT_SUCCESS（0）。
- **FXmacPhyWrite**：类似读操作，设置地址并写入 data。返回 FT_SUCCESS（0）。
- **细节**：操作基于 read_reg/write_reg（fxmac.rs），访问 Fxmac MMIO（基址 0x3200_C000）。飞腾派应用：读取 Status 寄存器（0x01）检查 LINK_UP (bit 2)。

### 中断与状态检测实现

中断处理在 fxmac_intr.rs 中实现，FXmacSetupIsr 注册回调函数。

- **phy_link_detect**：调用 FXmacPhyRead 读取 Status 寄存器（0x01），检查 PHY_STAT_LINK_STATUS（bit 2），返回 1（连接）或 0（断开）。
- **phy_autoneg_status**：读取 Status 寄存器，检查 PHY_STATUS_AUTONEGOTIATE_COMPLETE（bit 5），返回 1（完成）或 0（未完成）。
- **FXmacSetupIsr**：注册中断处理程序（如 FXmacRecvIsrHandler 处理 RX_INTR），通过 dma_request_irq 分配 IRQ（如 FXMAC0_QUEUE0_IRQ_NUM=87）。飞腾派应用：处理 YT8521 的 LINK_CHANGE 中断（bit 1），更新 link_status（FXMAC_LINKUP=1）。
- **FXmacRecvIsrHandler**：清除中断（FXMAC_IDR_OFFSET），更新 recv_flg，调用 ethernetif_input_to_recv_packets 处理接收数据。
