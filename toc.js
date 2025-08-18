// Populate the sidebar
//
// This is a script, and not included directly in the page, to control the total size of the book.
// The TOC contains an entry for each page, so if each page includes a copy of the TOC,
// the total size of the page becomes O(n**2).
class MDBookSidebarScrollbox extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        this.innerHTML = '<ol class="chapter"><li class="chapter-item expanded "><a href="preface.html">前言</a></li><li class="chapter-item expanded "><a href="chapter0/chapter_0.html">第零章：环境配置与预备知识</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="chapter0/0_1_hardware_intro.html">硬件平台介绍</a></li><li class="chapter-item expanded "><a href="chapter0/0_2_dev_env.html">开发环境准备</a></li><li class="chapter-item expanded "><a href="chapter0/0_3_prerequisites.html">前置知识引导</a></li></ol></li><li class="chapter-item expanded "><a href="chapter1/chapter_1.html">第一章：硬件控制类驱动</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="chapter1/1_1_gpio_driver.html">GPIO驱动开发</a></li><li class="chapter-item expanded "><a href="chapter1/1_2_pwm_driver.html">PWM驱动开发</a></li><li class="chapter-item expanded "><a href="chapter1/1_3_reset_pinmux.html">复位与引脚复用驱动</a></li></ol></li><li class="chapter-item expanded "><a href="chapter2/chapter_2.html">第二章：时钟管理类驱动</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="chapter2/2_1_clock.html">时钟设备驱动</a></li><li class="chapter-item expanded "><a href="chapter2/2_2_timer.html">Timer驱动</a></li><li class="chapter-item expanded "><a href="chapter2/2_3_watchdog.html">看门狗驱动</a></li></ol></li><li class="chapter-item expanded "><a href="chapter3/chapter_3.html">第三章：外设协议类驱动</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="chapter3/3_1_uart_driver.html">UART串口驱动</a></li><li class="chapter-item expanded "><a href="chapter3/3_2_i2c_driver.html">I2C驱动开发</a></li><li class="chapter-item expanded "><a href="chapter3/3_3_spi_driver.html">SPI驱动开发</a></li></ol></li><li class="chapter-item expanded "><a href="chapter4/chapter_4.html">第四章：中断</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="chapter4/4_1_gic.html">GIC驱动</a></li><li class="chapter-item expanded "><a href="chapter4/4_2_i2c_interrupt.html">i2c的中断实现</a></li><li class="chapter-item expanded "><a href="chapter4/4_3_spi_interrupt.html">spi的中断实现</a></li></ol></li><li class="chapter-item expanded "><a href="chapter5/chapter_5.html">第五章：高速传输类驱动</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="chapter5/5_1_dma_driver.html">DMA驱动开发</a></li><li class="chapter-item expanded "><a href="chapter5/5_2_pcie_basic.html">PCIe原理</a></li><li class="chapter-item expanded "><a href="chapter5/5_3_pcie_interconnect.html">PCIe互联驱动</a></li></ol></li><li class="chapter-item expanded "><a href="chapter6/chapter_6.html">第六章：网络通信类驱动</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="chapter6/6_1_igb_driver.html">IGB网卡驱动实现</a></li><li class="chapter-item expanded "><a href="chapter6/6_2_gmac_ethernet.html">GMAC以太网基础</a></li><li class="chapter-item expanded "><a href="chapter6/6_3_yt8521_driver.html">YT8521驱动实现</a></li><li class="chapter-item expanded "><a href="chapter6/6_4_net_device.html">net_device实现</a></li></ol></li><li class="chapter-item expanded "><a href="chapter7/chapter_7.html">第七章：存储驱动实现</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="chapter7/7_1_sd_driver.html">Micro SD驱动</a></li><li class="chapter-item expanded "><a href="chapter7/7_2_emmc_driver.html">eMMC驱动</a></li><li class="chapter-item expanded "><a href="chapter7/7_3_flash_driver.html">Flash驱动</a></li></ol></li><li class="chapter-item expanded "><a href="chapter8/chapter_8.html">第八章：多媒体方向</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="chapter8/8_1_usb_serial.html">USB串口驱动</a></li><li class="chapter-item expanded "><a href="chapter8/8_2_usb_camera.html">USB摄像头驱动</a></li></ol></li><li class="chapter-item expanded "><a href="chapter9/chapter_9.html">第九章：无线通讯方向</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="chapter9/9_1_wifi6_driver.html">WiFi6驱动开发</a></li><li class="chapter-item expanded "><a href="chapter9/9_2_bluetooth_driver.html">蓝牙驱动开发</a></li></ol></li><li class="chapter-item expanded "><a href="chapter10/chapter_10.html">第十章：实时工业总线方向</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="chapter10/10_1_canfd_driver.html">CANFD驱动</a></li><li class="chapter-item expanded "><a href="chapter10/10_2_ethercat_driver.html">EtherCAT驱动</a></li></ol></li><li class="chapter-item expanded "><a href="appendix/appendix.html">附录</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="appendix/A_1_TDD.html">测试驱动开发</a></li><li class="chapter-item expanded "><a href="appendix/A_2_design_patterns.html">设计模式</a></li><li class="chapter-item expanded "><a href="appendix/A_3_precautions.html">注意事项</a></li></ol></li></ol>';
        // Set the current, active page, and reveal it if it's hidden
        let current_page = document.location.href.toString().split("#")[0].split("?")[0];
        if (current_page.endsWith("/")) {
            current_page += "index.html";
        }
        var links = Array.prototype.slice.call(this.querySelectorAll("a"));
        var l = links.length;
        for (var i = 0; i < l; ++i) {
            var link = links[i];
            var href = link.getAttribute("href");
            if (href && !href.startsWith("#") && !/^(?:[a-z+]+:)?\/\//.test(href)) {
                link.href = path_to_root + href;
            }
            // The "index" page is supposed to alias the first chapter in the book.
            if (link.href === current_page || (i === 0 && path_to_root === "" && current_page.endsWith("/index.html"))) {
                link.classList.add("active");
                var parent = link.parentElement;
                if (parent && parent.classList.contains("chapter-item")) {
                    parent.classList.add("expanded");
                }
                while (parent) {
                    if (parent.tagName === "LI" && parent.previousElementSibling) {
                        if (parent.previousElementSibling.classList.contains("chapter-item")) {
                            parent.previousElementSibling.classList.add("expanded");
                        }
                    }
                    parent = parent.parentElement;
                }
            }
        }
        // Track and set sidebar scroll position
        this.addEventListener('click', function(e) {
            if (e.target.tagName === 'A') {
                sessionStorage.setItem('sidebar-scroll', this.scrollTop);
            }
        }, { passive: true });
        var sidebarScrollTop = sessionStorage.getItem('sidebar-scroll');
        sessionStorage.removeItem('sidebar-scroll');
        if (sidebarScrollTop) {
            // preserve sidebar scroll position when navigating via links within sidebar
            this.scrollTop = sidebarScrollTop;
        } else {
            // scroll sidebar to current active section when navigating via "next/previous chapter" buttons
            var activeSection = document.querySelector('#sidebar .active');
            if (activeSection) {
                activeSection.scrollIntoView({ block: 'center' });
            }
        }
        // Toggle buttons
        var sidebarAnchorToggles = document.querySelectorAll('#sidebar a.toggle');
        function toggleSection(ev) {
            ev.currentTarget.parentElement.classList.toggle('expanded');
        }
        Array.from(sidebarAnchorToggles).forEach(function (el) {
            el.addEventListener('click', toggleSection);
        });
    }
}
window.customElements.define("mdbook-sidebar-scrollbox", MDBookSidebarScrollbox);
