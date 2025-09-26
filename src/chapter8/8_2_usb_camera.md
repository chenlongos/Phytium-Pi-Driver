# 8.2 USB摄像头驱动

## USB摄像头测试用例

### 测试原理与目的

本次 UVC 和 USB 测试的目的：验证 USB 驱动能否正常枚举 UVC 摄像头，UVC 驱动能否采集摄像头的视频帧，并对视频帧的颜色（主题色）进行检测，确保 USB 总线管理与 UVC 视频采集功能正常。

### 测试前准备

**硬件准备**

将一个 **USB UVC 兼容摄像头**（如普通电脑摄像头）通过 USB 线连接到飞腾派的 USB 接口。

注：需要连接远离电路板的那个USB3.0接口。

**软件准备**

```sh
# 在测试机上执行
sudo apt install libudev-dev
cargo install ostool    # 安装辅助工具
git clone https://github.com/chenlongos/arceos-driver.git -b phytium-camp
cd arceos
```

### 执行测试命令

1. **配置测试项目**

   复制 UVC 测试的项目配置模板，如有需要还可以修改该配置模板。

```sh
cp phytium/app/uvc-detect/.project.toml-example ./project.toml
```

2. **启动测试并加载Arceos**

```sh
ostool run uboot
```

### 测试结果验证

当摄像头前面颜色发生变化时，输出日志上能显示新变化的颜色。
