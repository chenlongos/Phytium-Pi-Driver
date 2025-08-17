# 1.2 PWM驱动开发
## PWM介绍
PWM（Pulse Width Modulation）​​ 是一种通过调节脉冲宽度（占空比）来模拟不同模拟量输出的数字控制技术。它利用数字信号（高/低电平）控制模拟电路，广泛应用于电机调速、电源转换、LED调光等领域。其核心是通过调整脉冲的“有效时间比例”实现连续可调的电压、功率或信号输出

PWM 最关键的两个参数：频率和占空比。

频率是指单位时间内脉冲信号的周期数。比如开关灯，开关一次算一次周期，在 1s 进行多少次开关（开关一次为一个周期）。

占空比是指一个周期内高电平时间和低电平时间的比例。也拿开关当作例子，总共 100s，开了 50s 灯（高电平），关了 50s 灯（低电平），这时候的占空比就为 50%（比例）。

### PWM核心特性
1.占空比可变
- 占空比越大，等效输出电压越高（例：占空比50% ≈ 最大电压的50%）

2.​​数字模拟转换能力
- 微控制器通过输出高频方波（如10kHz），配合滤波电路，可生成平滑的模拟电压（如0-5V连续可调）

3.控制灵活性强
- 频率可调​​：适应不同负载需求（电机控制常用6-16kHz，LED调光>80Hz避频闪）
- 动态响应快​​：占空比可实时调整（如根据传感器反馈调节电机转速）

### PWM控制原理和工作过程
#### 关键参数
- 周期（T）​​：一个完整脉冲的时间（单位：秒）。
- 频率（f）​​：周期的倒数（f=1/T），决定信号切换速度。
- 脉宽时间（tW）​​：高电平持续时间，直接决定占空比

#### PWM波形生成过程
1.周期设定
- 通过定时器计数器设定周期值（PWM定时器的工作方式有点像一个精准的节拍器。它的核心是一个计数器，从0开始计数，数到某个设定值（称为模数）后清零，循环往复。这个模数决定了PWM信号的周期）
- 举例：假设模数设为9，计数器会从0数到9，总共10个状态，构成一个完整的周期。
- PWM定时器通常会有个预分频器，用来把主时钟频率降低，方便控制计数器的速度，这里我们假设主时钟频率24 MHz，预分频器可选1、2、4、8、16、32、64、128
- 预分频器的值决定了计数器的时钟频率，计数器的时钟频率 = 主时钟频率 / 预分频器的值
- 当预分频器设为8，计数器的时钟频率为24 MHz / 8 = 3 MHz

2.脉宽调制
- 设置“宽度寄存器”值W控制高电平时间，这里我们还是以上面的例子继续讲解：
- 我们需求电机静止脉宽：1.5毫秒，最大顺时针速度脉宽：1毫秒，最大逆时针速度脉宽：2毫秒
- 脉宽时间tW = W × 0.333微秒，W是宽度寄存器的值，由此
- 电机静止：1.5毫秒 ÷ 0.333微秒 ≈ 4500
- 最大顺时针速度：1毫秒 ÷ 0.333微秒 ≈ 3000
- 最大逆时针速度：2毫秒 ÷ 0.333微秒 ≈ 6000

## 飞腾派PWM硬件实现

飞腾派集成的 PWM 控制器支持典型的 PWM 功能，有 2 个完全独立的 compare 输出通道。使用 PWM 功能前，需要先配置相关 PAD 复用寄存器，将对应 PAD 配置到对应功能上，即可使用 PWM 功能。

**飞腾派PWM硬件模块**

| 模块 | 功能                       | 
| ---- | -------------------------- | 
| PWM控制器核心模块（处理器内置）​  | 支持​​compare输出模式，提供​​寄存器、FIFO双模式驱动，并支持​​中断控制​​：计数器溢出、比较匹配、FIFO空中断​​ |
| 死区生成器  | 防短路保护​​，并提供了Bypass（原始信号直通）、FallEdgeOnly（只添加下降沿延迟）、RiseEdgeOnly（只添加上升沿延迟）、FullDeadband（双边延迟）四种工作模式（由DBDLY和DBCTRL控制） | 

## 飞腾派 PWM 设备时序图

飞腾派（Phytium Pi）V3.x 版本的 PWM（脉宽调制）设备通过 PWM 控制器（基址 0x2804_A000~0x2805_1000）生成可调频率和占空比的信号，支持 8 个控制器，每个控制器 2 个通道（PWM0 和 PWM1），输出通过 40-pin 扩展头（如 Pin 32，GPIO1_1）。以下为 PWM 设备的典型时序图，展示通道配置和输出过程，以及中断处理流程（如 FIFO 空中断）。时序图基于 `pwm.rs` 驱动实现（`configure_channel` 和 `handle_interrupt`），参考飞腾派软件编程手册 V1.0（5.24 节），使用 Mermaid 绘制。

### PWM 通道配置与输出时序

**描述**：驱动通过寄存器（`tim_ctrl`, `pwm_period`, `pwm_ctrl`, `pwm_ccr`）配置 PWM 通道（例如通道 0，频率 1kHz，占空比 50%），启用输出（Pin 32）。过程包括设置分频、周期、占空比和比较模式（`ClearOnMatch`），最终生成 PWM 波形。

```mermaid
sequenceDiagram
    participant D as 驱动
    participant P as PWM控制器
    participant O as 输出引脚(Pin 32)
    D->>P: 写 tim_ctrl(DIV=50000, MODE=Modulo, ENABLE=0)
    D->>P: 写 pwm_period(CCR=999) // 1kHz
    D->>P: 写 pwm_ctrl(MODE=Compare, CMP=ClearOnMatch, IE=1)
    D->>P: 写 pwm_ccr(CCR=500) // 50% 占空比
    D->>P: 写 tim_ctrl(ENABLE=1)
    P->>O: 输出 PWM 波形(1kHz, 50% 占空比)
    Note over P,O: 周期 1ms, 高电平 0.5ms
```

**说明**：

- **时序**：配置分频（DIV=50000，50MHz/50000=1kHz），周期（CCR=999，1ms），占空比（CCR=500，50%）。启用后（ENABLE=1），PWM 控制器在 10ns 内输出波形。
- **硬件关联**：PWM 通道 0（基址 0x2804_A000，偏移 0x400~0x414），输出至 Pin 32（需 PAD 配置为 PWM，x_reg0=4）。
- **约束**：频率切换需等待计数器归零（<1ms），确保外设空闲（如 UART 无传输）。

## PWM 中断处理时序（FIFO 模式）

**描述**：驱动启用 FIFO 模式（DUTY_SEL=FIFO），配置通道 0（1kHz，50% 占空比），处理 FIFO 空中断（STATE::FIFO_EMPTY）。当计数器归零（tim_cnt=0），驱动重新填充占空比值，保持连续输出。

```mermaid
sequenceDiagram
    participant D as 驱动
    participant P as PWM控制器
    participant G as GIC中断控制器
    D->>P: 写 pwm_ctrl(FIFO_EMPTY_ENABLE=1, DUTY_SEL=FIFO)
    D->>P: 填充 pwm_ccr(CCR=500, 4次) // 50% 占空比
    P->>G: 触发 FIFO 空中断(STATE::FIFO_EMPTY=1)
    G->>D: 中断信号(GIC SPI)
    D->>P: 检查 tim_cnt(CNT=0)
    D->>P: 填充 pwm_ccr(CCR=500)
    D->>P: 清除 STATE::FIFO_EMPTY(写1)
    Note over P,D: 中断响应 <10ns
```

**说明**：

- **时序**：FIFO 空时触发中断（<10ns），驱动检查计数器（CNT=0），填充占空比（CCR=500），清除中断标志（RW1C）。中断周期与 PWM 频率一致（1ms for 1kHz）。
- **硬件关联**：中断通过 GIC（基址 0xFF84_1000），需 pinctrl.rs 配置引脚（Pin 32）。状态寄存器（偏移 0x408/0x808）使用 RW1C 清除。
- **约束**：FIFO 需预填充 4 个值，避免空中断频繁触发。

## 飞腾派PWM驱动API调用表

| **API函数**          | **描述**                                                     | **参数**                                                     | **返回值**                                       |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------ |
| ​​PwmDriver::new  | 创建 PWM 驱动实例并映射硬件寄存器。 | base_addr: PWM 控制器的物理基地址 | 初始化的 PwmDriver 对象  |
| configure_channel   | 配置 PWM 通道参数  | channel: PWM 通道号 (0-7)、config: PwmConfig 结构体，包含：frequency: PWM 频率 (Hz)、duty_cycle: 占空比 (0.0-1.0)、counting_mode: 计数模式 (Modulo/UpAndDown)、deadtime_ns: 死区时间 (纳秒)、use_fifo: 是否使用 FIFO 模式                 | Option：成功：Ok(())；失败：错误信息（如无效通道、占空比越界等）      |
| ​​init_fifo_mode   | 初始化 FIFO 模式                    | channel: PWM 通道号、     initial_duty: 初始占空比值                              | Option：成功：Ok(())；失败：错误信息  |
| ​​push_fifo_data    | 向 FIFO 推送占空比数据 | channel: PWM 通道号；duty_value: 16 位占空比值 | Option：成功：Ok(())；失败：错误信息          |
| enable_channel   | 启用 PWM 通道输出 | channel: PWM 通道号 | 无  |
| safe_stop_channel      | 安全停止 PWM 输出（防电源瞬变） | channel: PWM 通道号 | 无  |
| enable_multiple_channels | 同时启用多个 PWM 通道 | mask: 通道掩码（bit0=通道0, bit1=通道1, ...） | 无    |
| handle_interrupt     | 处理 PWM 中断               | 无 | 无  |
| pwm_init  | 初始化 PWM 控制器（高级封装）                  | base_addr: PWM 控制器物理基地址                          | 初始化的 PwmDriver 对象       |

## 飞腾派 PWM 设备驱动寄存器信息

以下为飞腾派（Phytium Pi）V3.x 版本 PWM（脉宽调制）设备驱动涉及的寄存器信息，基于在 `chenlongos/appd` 仓库 `phytium-pi` 分支中实现的 `modules/axhal/src/platform/aarch64_phytium_pi/pwm.rs` 文件。驱动设计使用 Rust 和 `tock_registers` 宏，遵循 ArceOS 的 `axhal` 框架，适配飞腾派 E2000 处理器的 PWM 控制器（支持 8 个控制器，每个控制器 2 个通道）。寄存器信息参考飞腾派软件编程手册 V1.0（表 5-67 和 5.24），包括基地址、寄存器表和位域定义。

### 基地址
PWM 驱动涉及 8 个 PWM 控制器和全局使能寄存器，基址如下：

| **模块**       | **基地址**  | **描述**                                   |
| -------------- | ----------- | ------------------------------------------ |
| PWM 控制器 0   | 0x2804_A000 | PWM0 控制器，2 个通道（PWM0_OUT/PWM1_OUT） |
| PWM 控制器 1   | 0x2804_B000 | PWM1 控制器                                |
| PWM 控制器 2   | 0x2804_C000 | PWM2 控制器                                |
| PWM 控制器 3   | 0x2804_D000 | PWM3 控制器                                |
| PWM 控制器 4   | 0x2804_E000 | PWM4 控制器                                |
| PWM 控制器 5   | 0x2804_F000 | PWM5 控制器                                |
| PWM 控制器 6   | 0x2805_0000 | PWM6 控制器                                |
| PWM 控制器 7   | 0x2805_1000 | PWM7 控制器                                |
| 全局使能寄存器 | 0x2807E020  | 控制所有 PWM 控制器的使能（bit 0-7）       |

### 寄存器表
每个 PWM 控制器包含死区控制寄存器（0x0000~0x03FF）和两个通道寄存器（通道 0: 0x0400~0x07FF，通道 1: 0x0800~0x0BFF）。以下为寄存器定义：

| **寄存器名称**   | **偏移地址** | **描述**                                                     |
| ---------------- | ------------ | ------------------------------------------------------------ |
| `dbctrl`         | 0x0000       | 死区控制寄存器，配置死区模式和输出极性。                     |
| `dbdly`          | 0x0004       | 死区延迟寄存器，设置上升/下降沿延迟周期。                    |
| `ch0_tim_cnt`    | 0x0400       | 通道 0 当前计数值寄存器，记录定时器计数值。                  |
| `ch0_tim_ctrl`   | 0x0404       | 通道 0 定时器控制寄存器，配置分频、计数模式和使能。          |
| `ch0_state`      | 0x0408       | 通道 0 状态寄存器，记录中断状态（FIFO 满/空、溢出、比较匹配）。 |
| `ch0_pwm_period` | 0x040C       | 通道 0 周期寄存器，设置 PWM 周期值。                         |
| `ch0_pwm_ctrl`   | 0x0410       | 通道 0 PWM 控制寄存器，配置输出模式、FIFO 和中断。           |
| `ch0_pwm_ccr`    | 0x0414       | 通道 0 占空比寄存器，设置比较值（占空比）。                  |
| `ch1_tim_cnt`    | 0x0800       | 通道 1 当前计数值寄存器，记录定时器计数值。                  |
| `ch1_tim_ctrl`   | 0x0804       | 通道 1 定时器控制寄存器，配置分频、计数模式和使能。          |
| `ch1_state`      | 0x0808       | 通道 1 状态寄存器，记录中断状态。                            |
| `ch1_pwm_period` | 0x080C       | 通道 1 周期寄存器，设置 PWM 周期值。                         |
| `ch1_pwm_ctrl`   | 0x0810       | 通道 1 PWM 控制寄存器，配置输出模式、FIFO 和中断。           |
| `ch1_pwm_ccr`    | 0x0814       | 通道 1 占空比寄存器，设置比较值（占空比）。                  |

### 寄存器位域设置
以下详细描述每个寄存器的位域，包括用途、有效值和默认状态。

#### `dbctrl` (偏移 0x0000, 读写)
- **OUT_MODE** (bit 4-5, 2 bits)
  - **用途**：配置死区输出模式。
  - **有效值**：
    - 0b00 = Bypass（无死区）
    - 0b01 = FallEdgeOnly（仅下降沿）
    - 0b10 = RiseEdgeOnly（仅上升沿）
    - 0b11 = FullDeadband（双边死区）
  - **默认值**：0b00
  - **描述**：控制 PWM0_OUT 和 PWM1_OUT 的死区行为（如电机驱动）。
- **POLSEL** (bit 2-3, 2 bits)
  - **用途**：配置输出极性。
  - **有效值**：
    - 0b00 = AH（PWM0_OUT/PWM1_OUT 不翻转）
    - 0b01 = ALC（PWM0_OUT 翻转）
    - 0b10 = AHC（PWM1_OUT 翻转）
    - 0b11 = AL（两者翻转）
  - **默认值**：0b00
  - **描述**：调整输出信号极性。
- **IN_MODE** (bit 1, 1 bit)
  - **用途**：选择死区输入源。
  - **有效值**：0 = PWM0，1 = PWM1
  - **默认值**：0
  - **描述**：选择 PWM 通道作为死区输入。
- **DB_SW_RST** (bit 0, 1 bit)
  - **用途**：软件复位死区控制。
  - **有效值**：0 = 正常，1 = 复位
  - **默认值**：0
  - **描述**：复位死区模块。

#### `dbdly` (偏移 0x0004, 读写)
- **DBFED** (bit 10-19, 10 bits)
  - **用途**：下降沿死区延迟周期（0~1023）。
  - **默认值**：0
  - **描述**：设置下降沿延迟（ns 级，基于 50MHz 时钟）。
- **DBRED** (bit 0-9, 10 bits)
  - **用途**：上升沿死区延迟周期（0~1023）。
  - **默认值**：0
  - **描述**：设置上升沿延迟。

#### `ch0_tim_cnt` / `ch1_tim_cnt` (偏移 0x0400/0x0800, 读写)
- **CNT** (bit 0-15, 16 bits)
  - **用途**：当前计数值。
  - **默认值**：0
  - **描述**：记录 PWM 计数器状态，用于中断或轮询。

#### `ch0_tim_ctrl` / `ch1_tim_ctrl` (偏移 0x0404/0x0804, 读写)
- **DIV** (bit 16-27, 12 bits)
  - **用途**：分频系数（1~4095）。
  - **默认值**：0
  - **描述**：基于 50MHz 系统时钟，计算频率（freq = 50MHz / DIV）。
- **GIE** (bit 5, 1 bit)
  - **用途**：全局中断使能。
  - **有效值**：0 = 禁用，1 = 启用
  - **默认值**：0
  - **描述**：控制所有中断输出。
- **OVFIF_ENABLE** (bit 4, 1 bit)
  - **用途**：溢出中断使能。
  - **有效值**：0 = 禁用，1 = 启用
  - **默认值**：0
  - **描述**：启用计数器溢出中断。
- **MODE** (bit 2, 1 bit)
  - **用途**：计数模式。
  - **有效值**：0 = Modulo（模计数），1 = UpAndDown（三角计数）
  - **默认值**：0
  - **描述**：控制计数行为。
- **ENABLE** (bit 1, 1 bit)
  - **用途**：通道使能。
  - **有效值**：0 = 禁用，1 = 启用
  - **默认值**：0
  - **描述**：启动 PWM 输出。
- **SW_RST** (bit 0, 1 bit)
  - **用途**：软件复位通道。
  - **有效值**：0 = 正常，1 = 复位
  - **默认值**：0
  - **描述**：复位计数器。

#### `ch0_state` / `ch1_state` (偏移 0x0408/0x0808, 读写)
- **FIFO_FULL** (bit 3, 1 bit, RW1C)
  - **用途**：FIFO 满中断标志，写 1 清除。
  - **默认值**：0
  - **描述**：指示 FIFO 满状态。
- **FIFO_EMPTY** (bit 2, 1 bit, RW1C)
  - **用途**：FIFO 空中断标志，写 1 清除。
  - **默认值**：0
  - **描述**：触发 FIFO 数据填充。
- **OVFIF** (bit 1, 1 bit, RW1C)
  - **用途**：计数器溢出中断标志，写 1 清除。
  - **默认值**：0
  - **描述**：指示周期完成。
- **CHIF** (bit 0, 1 bit, RW1C)
  - **用途**：比较匹配中断标志，写 1 清除。
  - **默认值**：0
  - **描述**：指示占空比匹配。

#### `ch0_pwm_period` / `ch1_pwm_period` (偏移 0x040C/0x080C, 读写)
- **CCR** (bit 0-15, 16 bits)
  - **用途**：周期值（实际周期 = CCR + 1）。
  - **默认值**：0
  - **描述**：设置 PWM 周期（如 999 for 1kHz）。

#### `ch0_pwm_ctrl` / `ch1_pwm_ctrl` (偏移 0x0410/0x0810, 读写)
- **FIFO_EMPTY_ENABLE** (bit 9, 1 bit)
  - **用途**：FIFO 空中断使能。
  - **有效值**：0 = 禁用，1 = 启用
  - **默认值**：0
  - **描述**：控制 FIFO 空中断。
- **DUTY_SEL** (bit 8, 1 bit)
  - **用途**：占空比模式。
  - **有效值**：0 = Register，1 = FIFO
  - **默认值**：0
  - **描述**：选择占空比数据源。
- **ICOV** (bit 7, 1 bit)
  - **用途**：初始输出值。
  - **有效值**：0 = 低，1 = 高
  - **默认值**：0
  - **描述**：设置 PWM 初始电平。
- **CMP** (bit 4-6, 3 bits)
  - **用途**：比较输出行为。
  - **有效值**：
    - 0b000 = SetOnMatch
    - 0b001 = ClearOnMatch
    - 0b010 = ToggleOnMatch
    - 0b011 = SetOnUpClearOnDown
    - 0b100 = ClearOnUpSetOnDown
    - 0b101 = ClearOnCCRSetOnPeriod
    - 0b110 = SetOnCCRClearOnPeriod
    - 0b111 = Initialize
  - **默认值**：0b000
  - **描述**：控制 PWM 输出动作。
- **IE** (bit 3, 1 bit)
  - **用途**：比较中断使能。
  - **有效值**：0 = 禁用，1 = 启用
  - **默认值**：0
  - **描述**：控制匹配中断。
- **MODE** (bit 2, 1 bit)
  - **用途**：PWM 模式。
  - **有效值**：0 = FreeRunning，1 = Compare
  - **默认值**：0
  - **描述**：选择运行或比较模式。

#### `ch0_pwm_ccr` / `ch1_pwm_ccr` (偏移 0x0414/0x0814, 读写)
- **CCR** (bit 0-15, 16 bits)
  - **用途**：占空比值。
  - **默认值**：0
  - **描述**：设置 PWM 占空比（如 500 for 50%）。

## 飞腾派 PWM 驱动实现讲解

**寄存器定义部分**

```rust
register_structs! {
    pub PwmRegisters {
        (0x0000 => dbctrl: ReadWrite<u32, DBCTRL::Register>),
        (0x0004 => dbdly: ReadWrite<u32, DBDLY::Register>),
        (0x0008 => _reserved_db: [u8; 0x3F8]),
        (0x0400 => ch0_tim_cnt: ReadWrite<u32, TIM_CNT::Register>),
        (0x0404 => ch0_tim_ctrl: ReadWrite<u32, TIM_CTRL::Register>),
        (0x0408 => ch0_state: ReadWrite<u32, STATE::Register>),
        (0x040C => ch0_pwm_period: ReadWrite<u32, PWM_PERIOD::Register>),
        (0x0410 => ch0_pwm_ctrl: ReadWrite<u32, PWM_CTRL::Register>),
        (0x0414 => ch0_pwm_ccr: ReadWrite<u32, PWM_CCR::Register>),
        (0x0418 => _reserved_ch0: [u8; 0x3E8]),
        (0x0800 => ch1_tim_cnt: ReadWrite<u32, TIM_CNT::Register>),
        (0x0804 => ch1_tim_ctrl: ReadWrite<u32, TIM_CTRL::Register>),
        (0x0808 => ch1_state: ReadWrite<u32, STATE::Register>),
        (0x080C => ch1_pwm_period: ReadWrite<u32, PWM_PERIOD::Register>),
        (0x0810 => ch1_pwm_ctrl: ReadWrite<u32, PWM_CTRL::Register>),
        (0x0814 => ch1_pwm_ccr: ReadWrite<u32, PWM_CCR::Register>),
        (0x0818 => @END),
    }
}
```

**讲解：**使用 tock_registers 宏定义 PWM 寄存器布局，每个控制器分为死区控制（0x0000~0x03FF）和通道寄存器（ch0: 0x0400~0x07FF, ch1: 0x0800~0x0BFF）。死区寄存器包括 dbctrl（死区模式/极性，0x0）和 dbdly（延迟周期，0x4）。每个通道有 tim_cnt（当前计数值，0x400/0x800）、tim_ctrl（分频/模式，0x404/0x804）、state（中断状态，0x408/0x808）、pwm_period（周期，0x40C/0x80C）、pwm_ctrl（输出行为，0x410/0x810）、pwm_ccr（占空比，0x414/0x814）。宏生成 ReadWrite 接口，确保类型安全。

**位域定义部分**

```rust
register_bitfields! {
    u32,
    DBCTRL [
        OUT_MODE OFFSET(4) NUMBITS(2) [Bypass = 0b00, FallEdgeOnly = 0b01, RiseEdgeOnly = 0b10, FullDeadband = 0b11],
        POLSEL OFFSET(2) NUMBITS(2) [AH = 0b00, ALC = 0b01, AHC = 0b10, AL = 0b11],
        IN_MODE OFFSET(1) NUMBITS(1) [PWM0 = 0, PWM1 = 1],
        DB_SW_RST OFFSET(0) NUMBITS(1) [Normal = 0, ResetActive = 1]
    ],
    DBDLY [
        DBFED OFFSET(10) NUMBITS(10) [],
        DBRED OFFSET(0) NUMBITS(10) []
    ],
    TIM_CNT [CNT OFFSET(0) NUMBITS(16) []],
    TIM_CTRL [
        DIV OFFSET(16) NUMBITS(12) [],
        GIE OFFSET(5) NUMBITS(1) [],
        OVFIF_ENABLE OFFSET(4) NUMBITS(1) [],
        MODE OFFSET(2) NUMBITS(1) [Modulo = 0, UpAndDown = 1],
        ENABLE OFFSET(1) NUMBITS(1) [Disabled = 0, Enabled = 1],
        SW_RST OFFSET(0) NUMBITS(1) [Normal = 0, ResetActive = 1]
    ],
    STATE [
        FIFO_FULL OFFSET(3) NUMBITS(1) [],
        FIFO_EMPTY OFFSET(2) NUMBITS(1) [],
        OVFIF OFFSET(1) NUMBITS(1) [],
        CHIF OFFSET(0) NUMBITS(1) []
    ],
    PWM_PERIOD [CCR OFFSET(0) NUMBITS(16) []],
    PWM_CTRL [
        FIFO_EMPTY_ENABLE OFFSET(9) NUMBITS(1) [],
        DUTY_SEL OFFSET(8) NUMBITS(1) [Register = 0, FIFO = 1],
        ICOV OFFSET(7) NUMBITS(1) [],
        CMP OFFSET(4) NUMBITS(3) [SetOnMatch = 0b000, ClearOnMatch = 0b001, ToggleOnMatch = 0b010, SetOnUpClearOnDown = 0b011, ClearOnUpSetOnDown = 0b100, ClearOnCCRSetOnPeriod = 0b101, SetOnCCRClearOnPeriod = 0b110, Initialize = 0b111],
        IE OFFSET(3) NUMBITS(1) [],
        MODE OFFSET(2) NUMBITS(1) [FreeRunning = 0, Compare = 1]
    ],
    PWM_CCR [CCR OFFSET(0) NUMBITS(16) []]
}
```

**讲解：**PwmConfig 定义通道配置（频率、占空比、计数模式等）。PwmChannel 存储通道状态（config 和 enabled）。PwmController 管理 2 个通道（base 地址如 0x2804_A000）。PwmSystem 包含 8 个控制器（基址 0x2804_A000~0x2805_1000）。全局使能寄存器（0x2807E020）控制所有控制器。SYSTEM_CLK=50MHz 匹配 clock.rs，CHANNELS_PER_CONTROLLER=2 符合手册。

**函数分析：PwmController 方法**

```rust
impl PwmController {
    pub unsafe fn new(base_addr: usize) -> Self {
        Self {
            base: base_addr,
            channels: [
                PwmChannel { config: None, enabled: false },
                PwmChannel { config: None, enabled: false }
            ],
        }
    }
    fn registers(&self) -> &PwmRegisters {
        unsafe { &*(self.base as *const PwmRegisters) }
    }
}
```

**讲解**：

- new：初始化控制器，设置基址（e.g., 0x2804_A000），初始化 2 个通道（未配置，未启用）。unsafe 处理指针。
- registers：返回寄存器视图，unsafe 确保基址有效。

**函数分析：configure_channel()**

```rust
pub fn configure_channel(&mut self, channel: usize, config: PwmConfig) -> Result<(), &'static str> {
    if channel >= CHANNELS_PER_CONTROLLER {
        return Err("Invalid channel number");
    }
    if config.duty_cycle > 1.0 || config.duty_cycle < 0.0 {
        return Err("Duty cycle must be between 0.0 and 1.0");
    }
    self.disable_channel(channel);
    let div = (SYSTEM_CLK / config.frequency) as u16;
    let period_cycles = (SYSTEM_CLK as f32 / (div as f32 * config.frequency as f32)) as u32;
    let period_reg = period_cycles.checked_sub(1).ok_or("Period too small")?;
    if period_reg > 0xFFFF {
        return Err("Period value too large");
    }
    let duty_cycles = (period_reg as f32 * config.duty_cycle) as u16;
    let regs = self.registers();
    if let Some(deadtime) = config.deadtime_ns {
        let delay_cycles = (deadtime as f32 * SYSTEM_CLK as f32 / 1e9) as u16;
        let delay_cycles = delay_cycles.min((1 << 10) - 1);
        regs.dbdly.write(DBDLY::DBRED.val(delay_cycles) + DBDLY::DBFED.val(delay_cycles));
        regs.dbctrl.modify(DBCTRL::OUT_MODE::FullDeadband + DBCTRL::IN_MODE::PWM0 + DBCTRL::POLSEL::AH);
    }
    let ch_reg = self.get_channel_reg(channel);
    ch_reg.tim_ctrl.write(TIM_CTRL::DIV.val(div.into()) + TIM_CTRL::MODE.val(config.counting_mode) + TIM_CTRL::ENABLE::Disabled);
    ch_reg.pwm_period.write(PWM_PERIOD::CCR.val(period_reg as u16));
    ch_reg.pwm_ctrl.modify(PWM_CTRL::MODE::Compare + PWM_CTRL::DUTY_SEL.val(config.use_fifo as u32) + PWM_CTRL::ICOV.val(config.initial_value) + PWM_CTRL::CMP.val(config.output_behavior) + PWM_CTRL::IE::SET);
    if config.use_fifo {
        for _ in 0..4 {
            ch_reg.pwm_ccr.write(PWM_CCR::CCR.val(duty_cycles));
        }
        ch_reg.pwm_ctrl.modify(PWM_CTRL::FIFO_EMPTY_ENABLE::SET);
    } else {
        ch_reg.pwm_ccr.write(PWM_CCR::CCR.val(duty_cycles));
    }
    self.channels[channel].config = Some(config);
    Ok(())
}
```

**讲解：**配置 PWM 通道（0 或 1）。检查通道号和占空比（0.0~1.0）。禁用通道，计算分频（div = SYSTEM_CLK / freq）和周期（period_cycles = SYSTEM_CLK / (div * freq)）。减 1 写入 pwm_period（手册 5.24.3.6）。计算占空比（duty_cycles = period_reg * duty_cycle）。配置死区（dbctrl/dbdly，100ns 级），设置 tim_ctrl（DIV、MODE）、pwm_ctrl（Compare、DUTY_SEL、ICOV、CMP、IE）、pwm_ccr（占空比）。FIFO 模式预填充 4 个值，启用空中断。保存配置，返回 Ok。

**函数分析：enable_channel() / disable_channel() / safe_stop_channel()**

```rust
pub fn enable_channel(&mut self, channel: usize) -> Result<(), &'static str> {
    if channel >= CHANNELS_PER_CONTROLLER {
        return Err("Invalid channel number");
    }
    let ch_reg = self.get_channel_reg(channel);
    ch_reg.tim_ctrl.modify(TIM_CTRL::ENABLE::SET);
    self.channels[channel].enabled = true;
    Ok(())
}

pub fn disable_channel(&mut self, channel: usize) {
    let ch_reg = self.get_channel_reg(channel);
    ch_reg.tim_ctrl.modify(TIM_CTRL::ENABLE::CLEAR);
    self.channels[channel].enabled = false;
}

pub fn safe_stop_channel(&mut self, channel: usize) -> Result<(), &'static str> {
    let ch_reg = self.get_channel_reg(channel);
    ch_reg.pwm_ccr.write(PWM_CCR::CCR.val(0));
    while ch_reg.tim_cnt.read(TIM_CNT::CNT) != 0 {
        cortex_m::asm::nop();
    }
    self.disable_channel(channel);
    Ok(())
}
```

**讲解**：

- enable_channel：检查通道号，设置 tim_ctrl 的 ENABLE bit=1，标记通道启用。
- disable_channel：清除 ENABLE bit，标记禁用。
- safe_stop_channel：清零占空比（pwm_ccr=0），等待计数器归零（tim_cnt=0），禁用通道。使用 nop 轮询（需添加超时）。

**函数分析：push_fifo_data() / handle_interrupt()**

```rust
pub fn push_fifo_data(&mut self, channel: usize, duty_value: u16) -> Result<(), &'static str> {
    if channel >= CHANNELS_PER_CONTROLLER {
        return Err("Invalid channel number");
    }
    let ch_reg = self.get_channel_reg(channel);
    if ch_reg.state.matches_all(STATE::FIFO_FULL::SET) {
        return Err("FIFO full");
    }
    ch_reg.pwm_ccr.write(PWM_CCR::CCR.val(duty_value));
    Ok(())
}

pub fn handle_interrupt(&mut self) {
    for channel in 0..CHANNELS_PER_CONTROLLER {
        if let Err(e) = self.handle_channel_interrupt(channel) {
            // log::error!("PWM ch{} error: {}", channel, e);
        }
    }
}

fn handle_channel_interrupt(&mut self, channel: usize) -> Result<(), &'static str> {
    let ch_reg = self.get_channel_reg(channel);
    let state = ch_reg.state.get();
    if state & STATE::FIFO_EMPTY.mask != 0 {
        if ch_reg.tim_cnt.read(TIM_CNT::CNT) == 0 {
            if let Some(config) = &self.channels[channel].config {
                let period = ch_reg.pwm_period.read(PWM_PERIOD::CCR) + 1;
                let duty_cycles = (period as f32 * config.duty_cycle) as u16;
                self.push_fifo_data(channel, duty_cycles)?;
            }
        }
        ch_reg.state.write(STATE::FIFO_EMPTY::SET);
    }
    if state & STATE::OVFIF.mask != 0 {
        ch_reg.state.write(STATE::OVFIF::SET);
    }
    if state & STATE::CHIF.mask != 0 {
        ch_reg.state.write(STATE::CHIF::SET);
    }
    Ok(())
}
```

**讲解**：

- push_fifo_data：检查通道和 FIFO 状态（FIFO_FULL），写入占空比到 pwm_ccr。RW1C 清除中断标志。
- handle_interrupt：遍历 2 个通道，调用 handle_channel_interrupt。
- handle_channel_interrupt：检查 state（FIFO_EMPTY/OVFIF/CHIF），FIFO 空时重新填充占空比（计数器=0），清除中断标志（RW1C）。支持 FIFO 动态更新。

**函数分析：PwmSystem 方法**

```rust
impl PwmSystem {
    pub fn new() -> Self {
        const CONTROLLER_BASES: [usize; PWM_CONTROLLERS] = [
            0x2804_A000, 0x2804_B000, 0x2804_C000, 0x2804_D000,
            0x2804_E000, 0x2804_F000, 0x2805_0000, 0x2805_1000,
        ];
        let controllers = CONTROLLER_BASES.map(|base| unsafe { PwmController::new(base) });
        Self { controllers }
    }

    pub fn global_enable(&self) {
        let mut enable_mask: u32 = 0;
        for (i, ctrl) in self.controllers.iter().enumerate() {
            if ctrl.channels.iter().any(|ch| ch.config.is_some()) {
                enable_mask |= 1 << i;
            }
        }
        unsafe {
            let reg_ptr = GLOBAL_ENABLE_REG_ADDR as *mut u32;
            reg_ptr.write_volatile(enable_mask);
        }
    }

    pub fn controller(&mut self, index: usize) -> Option<&mut PwmController> {
        if index < PWM_CONTROLLERS {
            Some(&mut self.controllers[index])
        } else {
            None
        }
    }
}
```

**讲解**：

- new：初始化 8 个控制器，基址从 0x2804_A000 到 0x2805_1000（手册表 5-67）。unsafe 构造。
- global_enable：检查配置通道，生成使能掩码（bit 0-7），写入全局使能寄存器（0x2807E020，volatile 确保写入）。
- controller：返回指定控制器（index 0~7），支持动态访问。
