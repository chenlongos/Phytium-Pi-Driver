# 2.2 时钟源驱动
时钟是嵌入式系统的"心跳"，它驱动着系统的运行和数据的流动，同时影响着系统的能耗．因此，外设的时钟以一种树状的形式在SoC中被组织起来，我们称之为"时钟树"，每个"节点"都代表着具有不同频率或性质的时钟源．

根据时钟源的性质，除了某些特定的时钟源，大部分设备的时钟源在Linux内核中可以被分成6大类：
+ fixed-clock: 表示频率固定，不可更改的时钟源．在设备树或驱动中，其只需指定频率，无需动态调整．
+ fixed-factor-clock: 表示由一个父时钟通过固定的倍频（乘法因子）和分频（除法因子）得到的时钟源。它的频率由父时钟频率乘以一个固定的分子再除以一个固定的分母，不能动态调整，只能在设备树或驱动中静态配置．
+ divider-clock: 表示通过对父时钟进行分频（除法因子）得到的时钟源。它的输出频率等于父时钟频率除以一个可配置的分频值。通常用于降低时钟频率以满足外设需求，分频值可以在驱动或设备树中配置，有些情况下支持动态调整.
+ gate-clock: 表示可以通过使能或关闭来控制时钟信号输出的时钟源。它通常用于控制外设的时钟开关，实现节能或功能管理。`gate-clock` 只负责时钟的开关，不改变时钟频率，相关配置可在驱动或设备树中完成．
+ mux-clock: 表示可以在多个父时钟之间选择一个作为输出源的时钟节点。它通过切换父时钟，实现时钟源的灵活选择，适用于需要根据不同工作模式或性能需求动态切换时钟源的场景。相关配置可在驱动或设备树中完成．
+ composite-clock: `composite-clock` 是 Linux 时钟框架中的一种复合型时钟节点，集成了分频（divider）、选择（mux）和开关（gate）等多种功能。它可以灵活地组合这些功能，实现复杂的时钟控制需求。`composite-clock` 适用于需要同时支持时钟源切换、分频和使能控制的场景，相关配置可在驱动或设备树中完成．

在linux中，时钟的管理依赖于[Common Clk Framework](https://docs.kernel.org/driver-api/clk.html)．CCF将这些时钟设备的共性抽象出来，使用`struct clk_hw`来表示
```rust
/**
 * struct clk_hw - handle for traversing from a struct clk to its corresponding
 * hardware-specific structure.  struct clk_hw should be declared within struct
 * clk_foo and then referenced by the struct clk instance that uses struct
 * clk_foo's clk_ops
 *
 * @core: pointer to the struct clk_core instance that points back to this
 * struct clk_hw instance
 *
 * @clk: pointer to the per-user struct clk instance that can be used to call
 * into the clk API
 *
 * @init: pointer to struct clk_init_data that contains the init data shared
 * with the common clock framework. This pointer will be set to NULL once
 * a clk_register() variant is called on this clk_hw pointer.
 */
struct clk_hw {
	struct clk_core *core;
	struct clk *clk;
	const struct clk_init_data *init;
};
```
其中，`init`字段，是驱动要关心的，在驱动初始化过程中，需要调用`clk_register()`结构注册时钟硬件．而在此之前，驱动需要填充`init`字段．`struct clk_core`的定义如下
```c
struct clk_init_data {
	const char *name;
	const struct clk_ops *ops;
	const char* const *parent_names;
	u8 num_parents;
	unsigned long flags;
};
```
`ops`是一组与时钟相关的函数，它决定了时钟能提供的功能，上层驱动通过一组`clk_*`的API可以调用它们．其定义在`include/linux/clk-provider.h`中
```c
/**
 * struct clk_ops -  Callback operations for hardware clocks; these are to
 * be provided by the clock implementation, and will be called by drivers
 * through the clk_* api.
 *
 * @prepare:	Prepare the clock for enabling. This must not return until
 *		the clock is fully prepared, and it's safe to call clk_enable.
 *		This callback is intended to allow clock implementations to
 *		do any initialisation that may sleep. Called with
 *		prepare_lock held.
 *
 * @unprepare:	Release the clock from its prepared state. This will typically
 *		undo any work done in the @prepare callback. Called with
 *		prepare_lock held.
 *
 * @is_prepared: Queries the hardware to determine if the clock is prepared.
 *		This function is allowed to sleep. Optional, if this op is not
 *		set then the prepare count will be used.
 *
 * @unprepare_unused: Unprepare the clock atomically.  Only called from
 *		clk_disable_unused for prepare clocks with special needs.
 *		Called with prepare mutex held. This function may sleep.
 *
 * @enable:	Enable the clock atomically. This must not return until the
 *		clock is generating a valid clock signal, usable by consumer
 *		devices. Called with enable_lock held. This function must not
 *		sleep.
 *
 * @disable:	Disable the clock atomically. Called with enable_lock held.
 *		This function must not sleep.
 *
 * @is_enabled:	Queries the hardware to determine if the clock is enabled.
 *		This function must not sleep. Optional, if this op is not
 *		set then the enable count will be used.
 *
 * @disable_unused: Disable the clock atomically.  Only called from
 *		clk_disable_unused for gate clocks with special needs.
 *		Called with enable_lock held.  This function must not
 *		sleep.
 *
 * @save_context: Save the context of the clock in prepration for poweroff.
 *
 * @restore_context: Restore the context of the clock after a restoration
 *		of power.
 *
 * @recalc_rate: Recalculate the rate of this clock, by querying hardware. The
 *		parent rate is an input parameter.  It is up to the caller to
 *		ensure that the prepare_mutex is held across this call. If the
 *		driver cannot figure out a rate for this clock, it must return
 *		0. Returns the calculated rate. Optional, but recommended - if
 *		this op is not set then clock rate will be initialized to 0.
 *
 * @round_rate:	Given a target rate as input, returns the closest rate actually
 *		supported by the clock. The parent rate is an input/output
 *		parameter.
 *
 * @determine_rate: Given a target rate as input, returns the closest rate
 *		actually supported by the clock, and optionally the parent clock
 *		that should be used to provide the clock rate.
 *
 * @set_parent:	Change the input source of this clock; for clocks with multiple
 *		possible parents specify a new parent by passing in the index
 *		as a u8 corresponding to the parent in either the .parent_names
 *		or .parents arrays.  This function in affect translates an
 *		array index into the value programmed into the hardware.
 *		Returns 0 on success, -EERROR otherwise.
 *
 * @get_parent:	Queries the hardware to determine the parent of a clock.  The
 *		return value is a u8 which specifies the index corresponding to
 *		the parent clock.  This index can be applied to either the
 *		.parent_names or .parents arrays.  In short, this function
 *		translates the parent value read from hardware into an array
 *		index.  Currently only called when the clock is initialized by
 *		__clk_init.  This callback is mandatory for clocks with
 *		multiple parents.  It is optional (and unnecessary) for clocks
 *		with 0 or 1 parents.
 *
 * @set_rate:	Change the rate of this clock. The requested rate is specified
 *		by the second argument, which should typically be the return
 *		of .round_rate call.  The third argument gives the parent rate
 *		which is likely helpful for most .set_rate implementation.
 *		Returns 0 on success, -EERROR otherwise.
 *
 * @set_rate_and_parent: Change the rate and the parent of this clock. The
 *		requested rate is specified by the second argument, which
 *		should typically be the return of .round_rate call.  The
 *		third argument gives the parent rate which is likely helpful
 *		for most .set_rate_and_parent implementation. The fourth
 *		argument gives the parent index. This callback is optional (and
 *		unnecessary) for clocks with 0 or 1 parents as well as
 *		for clocks that can tolerate switching the rate and the parent
 *		separately via calls to .set_parent and .set_rate.
 *		Returns 0 on success, -EERROR otherwise.
 *
 * @recalc_accuracy: Recalculate the accuracy of this clock. The clock accuracy
 *		is expressed in ppb (parts per billion). The parent accuracy is
 *		an input parameter.
 *		Returns the calculated accuracy.  Optional - if	this op is not
 *		set then clock accuracy will be initialized to parent accuracy
 *		or 0 (perfect clock) if clock has no parent.
 *
 * @get_phase:	Queries the hardware to get the current phase of a clock.
 *		Returned values are 0-359 degrees on success, negative
 *		error codes on failure.
 *
 * @set_phase:	Shift the phase this clock signal in degrees specified
 *		by the second argument. Valid values for degrees are
 *		0-359. Return 0 on success, otherwise -EERROR.
 *
 * @get_duty_cycle: Queries the hardware to get the current duty cycle ratio
 *              of a clock. Returned values denominator cannot be 0 and must be
 *              superior or equal to the numerator.
 *
 * @set_duty_cycle: Apply the duty cycle ratio to this clock signal specified by
 *              the numerator (2nd argurment) and denominator (3rd  argument).
 *              Argument must be a valid ratio (denominator > 0
 *              and >= numerator) Return 0 on success, otherwise -EERROR.
 *
 * @init:	Perform platform-specific initialization magic.
 *		This is not used by any of the basic clock types.
 *		This callback exist for HW which needs to perform some
 *		initialisation magic for CCF to get an accurate view of the
 *		clock. It may also be used dynamic resource allocation is
 *		required. It shall not used to deal with clock parameters,
 *		such as rate or parents.
 *		Returns 0 on success, -EERROR otherwise.
 *
 * @terminate:  Free any resource allocated by init.
 *
 * @debug_init:	Set up type-specific debugfs entries for this clock.  This
 *		is called once, after the debugfs directory entry for this
 *		clock has been created.  The dentry pointer representing that
 *		directory is provided as an argument.  Called with
 *		prepare_lock held.  Returns 0 on success, -EERROR otherwise.
 *
 *
 * The clk_enable/clk_disable and clk_prepare/clk_unprepare pairs allow
 * implementations to split any work between atomic (enable) and sleepable
 * (prepare) contexts.  If enabling a clock requires code that might sleep,
 * this must be done in clk_prepare.  Clock enable code that will never be
 * called in a sleepable context may be implemented in clk_enable.
 *
 * Typically, drivers will call clk_prepare when a clock may be needed later
 * (eg. when a device is opened), and clk_enable when the clock is actually
 * required (eg. from an interrupt). Note that clk_prepare MUST have been
 * called before clk_enable.
 */
struct clk_ops {
	int		(*prepare)(struct clk_hw *hw);
	void		(*unprepare)(struct clk_hw *hw);
	int		(*is_prepared)(struct clk_hw *hw);
	void		(*unprepare_unused)(struct clk_hw *hw);
	int		(*enable)(struct clk_hw *hw);
	void		(*disable)(struct clk_hw *hw);
	int		(*is_enabled)(struct clk_hw *hw);
	void		(*disable_unused)(struct clk_hw *hw);
	int		(*save_context)(struct clk_hw *hw);
	void		(*restore_context)(struct clk_hw *hw);
	unsigned long	(*recalc_rate)(struct clk_hw *hw,
					unsigned long parent_rate);
	long		(*round_rate)(struct clk_hw *hw, unsigned long rate,
					unsigned long *parent_rate);
	int		(*determine_rate)(struct clk_hw *hw,
					  struct clk_rate_request *req);
	int		(*set_parent)(struct clk_hw *hw, u8 index);
	u8		(*get_parent)(struct clk_hw *hw);
	int		(*set_rate)(struct clk_hw *hw, unsigned long rate,
				    unsigned long parent_rate);
	int		(*set_rate_and_parent)(struct clk_hw *hw,
				    unsigned long rate,
				    unsigned long parent_rate, u8 index);
	unsigned long	(*recalc_accuracy)(struct clk_hw *hw,
					   unsigned long parent_accuracy);
	int		(*get_phase)(struct clk_hw *hw);
	int		(*set_phase)(struct clk_hw *hw, int degrees);
	int		(*get_duty_cycle)(struct clk_hw *hw,
					  struct clk_duty *duty);
	int		(*set_duty_cycle)(struct clk_hw *hw,
					  struct clk_duty *duty);
	int		(*init)(struct clk_hw *hw);
	void		(*terminate)(struct clk_hw *hw);
	void		(*debug_init)(struct clk_hw *hw, struct dentry *dentry);
};
```
这些函数的实现是可选择的，一些是强制性的，这取决于时钟的类型．以fixed-rate类型为例，这也是飞腾派设备树中定义的唯一时钟类型，该类型对应的ops在内核中有定义
```c
static unsigned long clk_fixed_rate_recalc_rate(struct clk_hw *hw,
		unsigned long parent_rate)
{
	return to_clk_fixed_rate(hw)->fixed_rate;
}

static unsigned long clk_fixed_rate_recalc_accuracy(struct clk_hw *hw,
		unsigned long parent_accuracy)
{
	struct clk_fixed_rate *fixed = to_clk_fixed_rate(hw);

	if (fixed->flags & CLK_FIXED_RATE_PARENT_ACCURACY)
		return parent_accuracy;

	return fixed->fixed_accuracy;
}

const struct clk_ops clk_fixed_rate_ops = {
	.recalc_rate = clk_fixed_rate_recalc_rate,
	.recalc_accuracy = clk_fixed_rate_recalc_accuracy,
};
```
而其它内核模块，可以通过
```c
/**
 * clk_get_rate - return the rate of clk
 * @clk: the clk whose rate is being returned
 *
 * Simply returns the cached rate of the clk, unless CLK_GET_RATE_NOCACHE flag
 * is set, which means a recalc_rate will be issued. Can be called regardless of
 * the clock enabledness. If clk is NULL, or if an error occurred, then returns
 * 0.
 */
unsigned long clk_get_rate(struct clk *clk)
{
	unsigned long rate;

	if (!clk)
		return 0;

	clk_prepare_lock();
	rate = clk_core_get_rate_recalc(clk->core);
	clk_prepare_unlock();

	return rate;
}
EXPORT_SYMBOL_GPL(clk_get_rate);
```
调用`recalc_rate`获取到时钟的频率．

那么外设又是如何获取到对应的时钟呢？依然是通过设备树，以飞腾派的串口设备树定义为例
```
uart1: uart@2800d000 {
	compatible = "arm,pl011", "arm,primecell";
	reg = <0x0 0x2800d000 0x0 0x1000>;
	interrupts = <GIC_SPI 84 IRQ_TYPE_LEVEL_HIGH>;
	clocks = <&sysclk_100mhz &sysclk_100mhz>;
	clock-names = "uartclk", "apb_pclk";
	status = "disabled";
};
```
时钟是通过`clocks`属性分配给使用者的，该节点定义了串口依赖两个时钟，分别名为`uartclk`和`apb_pclk`，我们可以通过`devm_clk_get`函数获取到对应的时钟设备接口．

在`drivers/tty/serial/phytium-uart-v2.c`可以看到这样一行逻辑
```c
pup->clk = devm_clk_get(&pdev->dev, "uartclk");
```
即获取外设对应的clk．
