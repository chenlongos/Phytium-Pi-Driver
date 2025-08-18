# 6.4 GMAC以太网基础

### GMAC 以太网设备原理

以太网（Ethernet）是一种基于 IEEE 802.3 标准的局域网技术，用于设备间数据通信，运行在 OSI 模型的物理层（Layer 1）和数据链路层（Layer 2）。数据链路层分为逻辑链路控制（LLC）和介质访问控制（MAC）子层。GMAC（Gigabit Media Access Controller）是 MAC 层的硬件实现，负责帧封装、校验和流控制，支持 10/100/1000 Mbps 速率。它通过 RGMII 或 SGMII 接口连接 PHY 芯片，处理以太网帧的发送和接收。以太网帧结构包含 6 字节目的 MAC 地址、6 字节源 MAC 地址、2 字节类型/长度、46~1500 字节负载和 4 字节 CRC 校验，支持 VLAN 标签（802.1Q）。GMAC 使用 CSMA/CD（载波监听多路访问/冲突检测）在半双工模式下避免冲突，检测总线空闲后发送帧，冲突时退避重传。全双工模式下无冲突，支持 PAUSE 帧流控制。GMAC 的 DMA 引擎通过批量传输（burst mode）搬移数据，减少 CPU 负载，中断机制（TX/RX 完成）优化性能。

#### 以太网帧结构

| **字段**      | **长度（字节）** | **描述**                           |
| ------------- | ---------------- | ---------------------------------- |
| 目的 MAC 地址 | 6                | 目标设备 MAC 地址                  |
| 源 MAC 地址   | 6                | 发送设备 MAC 地址                  |
| 类型/长度     | 2                | 协议类型（如 IPv4=0x0800）或帧长度 |
| 负载          | 46~1500          | 数据内容（可含 VLAN 标签）         |
| CRC 校验      | 4                | 帧完整性校验                       |

工作流程包括：

- **发送**：CPU 配置 NET_CFG（速度/双工），写入 TX FIFO，DMA 搬移数据到 PHY，GMAC 封装帧，发送后触发 TX_INTR 中断。
- **接收**：PHY 接收帧，GMAC 验证 CRC，存入 RX FIFO，DMA 搬移到内存，触发 RX_INTR 中断。
- **中断**：INTR_EN 使能 TX/RX 完成中断，INTR_STATUS 记录状态，PHY_MGMT 管理 PHY（如链路状态）。

------

### 飞腾派的网卡设备

飞腾派（Phytium Pi）基于飞腾 D2000 处理器（ARMv8-A），其网卡设备使用 Fxmac（Phytium MAC）控制器，支持双千兆以太网接口（1Gbps），通过 SGMII 接口连接 RTL8211F PHY 芯片，提供高效网络通信。Fxmac 是飞腾自研的 GMAC 实现，基址为 0x3200_C000（Ethernet1）和 0x3200_E000（Ethernet2），支持 DMA 传输、中断处理和流控制，适用于物联网、边缘计算等场景。设备通过 PAD（基址 0x32B30000）配置引脚（如 MIO for Ethernet），MIO（0x2801_4000~0x2803_2000）选择功能（x_reg0=0）。驱动在 ArceOS 的 axdriver_net 模块实现，通过 FxmacInit 配置速度（G1=1000 Mbps）、双工模式（全双工）和 DMA 参数（TX/RX BUF_SIZE=8）。中断通过 GIC 路由（IRQ 未知），支持 MSI（Message Signaled Interrupts）。

#### Fxmac 寄存器表

| **寄存器**  | **偏移** | **功能**                  | **关键位域**                                                 |
| ----------- | -------- | ------------------------- | ------------------------------------------------------------ |
| NET_CFG     | 0x000    | 配置速度、双工、MDIO 使能 | SPEED (bit 0-1: 00=10M, 01=100M, 10=1G), DUPLEX (bit 2), MDIO_EN (bit 3) |
| NET_STATUS  | 0x008    | 链路状态                  | LINK_UP (bit 0)                                              |
| DMA_CFG     | 0x010    | DMA 配置（缓冲大小/使能） | DMA_EN (bit 0), TX_BUF_SIZE (bit 8-15)                       |
| TX_STATUS   | 0x014    | 发送状态                  | TX_COMPLETE (bit 0), TX_ERR (bit 1)                          |
| RX_STATUS   | 0x018    | 接收状态                  | RX_COMPLETE (bit 0), RX_ERR (bit 1)                          |
| INTR_EN     | 0x01C    | 中断使能                  | TX_INTR_EN (bit 0), RX_INTR_EN (bit 1)                       |
| INTR_STATUS | 0x020    | 中断状态                  | TX_INTR (bit 0), RX_INTR (bit 1)                             |
| PHY_MGMT    | 0x024    | PHY 管理（MDIO 接口）     | PHY_ADDR (bit 0-4), REG_ADDR (bit 5-9)                       |

**硬件特性**：

- **接口**：SGMII，连接 RTL8211F PHY，支持 10/100/1000 Mbps 自适应。
- **中断**：TX_INTR（发送完成）、RX_INTR（接收完成）、LINK_INTR（链路状态变化）。
- **DMA**：支持 burst 传输（8~16 字节/次），TX/RX FIFO 深度可调（默认 8）。
- **扩展**：Mini-PCIe 接口可连接外部网卡（如 Ixgeb 10GbE），但 Fxmac 为内置千兆网口。

**设备树**（phytium_pi.dts）

```shell
ethernet@3200c000 {
    compatible = "phytium,fxmac";
    reg = <0x0 0x3200C000 0x0 0x2000>;
    phy-mode = "sgmii";
    phy-handle = <&rtl8211f>;
};
ethernet@3200e000 {
    compatible = "phytium,fxmac";
    reg = <0x0 0x3200E000 0x0 0x2000>;
    phy-mode = "sgmii";
    phy-handle = <&rtl8211f>;
};
```

**接收时序表**

| **阶段**   | **描述**                          | **延迟（100 MHz）** |
| ---------- | --------------------------------- | ------------------- |
| PHY 接收帧 | YT8521 解码链路数据，存入 RX FIFO | ~50 ns              |
| DMA 搬移   | RX FIFO 数据搬移到内存            | ~100 ns             |
| 中断触发   | RX_INTR (INTR_STATUS bit 1=1)     | ~10 ns              |
| CPU 处理   | 检查 RX_STATUS, 清 INTR_STATUS    | ~100 ns             |

