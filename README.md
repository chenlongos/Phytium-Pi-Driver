# Phytium-Pi-Driver
飞腾派驱动开发指导书，本教程仍在撰写中。

- [前言](src/preface.md)

- [第零章：环境配置与预备知识](src/chapter0/chapter_0.md)
  * [硬件平台介绍](src/chapter0/0_1_hardware_intro.md)
  * [开发环境准备](src/chapter0/0_2_dev_env.md)
  * [前置知识引导](src/chapter0/0_3_prerequisites.md)

- [第一章：硬件控制类驱动](src/chapter1/chapter_1.md)
  * [GPIO驱动开发](src/chapter1/1_1_gpio_driver.md)
  * [PWM驱动开发](src/chapter1/1_2_pwm_driver.md)
  * [复位与引脚复用驱动](src/chapter1/1_3_reset_pinmux.md)

- [第二章：时钟管理类驱动](src/chapter2/chapter_2.md)
  * [时钟设备驱动](src/chapter2/2_1_clock.md)
  * [Timer驱动](src/chapter2/2_2_timer.md)
  * [看门狗驱动](src/chapter2/2_3_watchdog.md)

- [第三章：外设协议类驱动](src/chapter3/chapter_3.md)
  * [UART串口驱动](src/chapter3/3_1_uart_driver.md)
  * [I2C驱动开发](src/chapter3/3_2_i2c_driver.md)
  * [SPI驱动开发](src/chapter3/3_3_spi_driver.md)
  
- [第四章：中断](src/chapter4/chapter_4.md)
  * [GIC驱动](src/chapter4/4_1_gic.md)
  * [i2c的中断实现](src/chapter4/4_2_i2c_interrupt.md)
  * [spi的中断实现](src/chapter4/4_3_spi_interrupt.md)

- [第五章：高速传输类驱动](src/chapter5/chapter_5.md)
  * [DMA驱动开发](src/chapter5/5_1_dma_driver.md)
  * [PCI控制器驱动](src/chapter5/5_2_pci_controller.md)
  * [PCIe互联驱动](src/chapter5/5_3_pcie_interconnect.md)

- [第六章：网络通信类驱动](src/chapter6/chapter_6.md)
  * [单元测试与调试](src/chapter6/6_1_unit_testing.md)
  * [PCIe网卡驱动基础](src/chapter6/6_2_pcie_nic_basic.md)
  * [IGB网卡驱动实现](src/chapter6/6_3_igb_driver.md)
  * [GMAC以太网基础](src/chapter6/6_4_gmac_ethernet.md)
  * [YT8521驱动实现](src/chapter6/6_5_yt8521_driver.md)
  * [net_device实现](src/chapter6/6_6_net_device.md)

- [第七章：存储驱动实现](src/chapter7/chapter_7.md)
  * [Micro SD驱动](src/chapter7/7_1_sd_driver.md)
  * [eMMC驱动](src/chapter7/7_2_emmc_driver.md)
  * [Flash驱动](src/chapter7/7_3_flash_driver.md)

- [第八章：多媒体方向](src/chapter8/chapter_8.md)
  * [USB串口驱动](src/chapter8/8_1_usb_serial.md)
  * [USB摄像头驱动](src/chapter8/8_2_usb_camera.md)
  
- [第九章：无线通讯方向](src/chapter9/chapter_9.md)
  * [WiFi6驱动开发](src/chapter9/9_1_wifi6_driver.md)
  * [蓝牙驱动开发](src/chapter9/9_2_bluetooth_driver.md)

- [第十章：实时工业总线方向](src/chapter10/chapter_10.md)
  * [CANFD驱动](src/chapter10/10_1_canfd_driver.md)
  * [EtherCAT驱动](src/chapter10/10_2_ethercat_driver.md)

- [附录](src/appendix/appendix.md)
  * [测试驱动开发](src/appendix/A_1_TDD.md)
  * [设计模式](src/appendix/A_2_design_patterns.md)
  * [注意事项](src/appendix/A_3_precautions.md)