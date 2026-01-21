/**
 * 进度条配置项
 */
interface ProgressBarOptions {
    total: number; // 总任务数（如总单位数）
    barLength?: number; // 进度条长度（默认20字符）
    fillChar?: string; // 填充字符（默认"█"）
    emptyChar?: string; // 空白字符（默认"░"）
    prefix?: string; // 前缀文本（默认"处理中："）
    suffix?: string; // 后缀文本（默认"完成"）
}

/**
 * 进度条工具类
 */
export class ProgressBar {
    private total: number;
    private barLength: number;
    private fillChar: string;
    private emptyChar: string;
    private prefix: string;
    private suffix: string;
    private current = 0; // 当前完成数

    constructor(options: ProgressBarOptions) {
        this.total = options.total;
        this.barLength = options.barLength || 20;
        this.fillChar = options.fillChar || "█";
        this.emptyChar = options.emptyChar || "░";
        this.prefix = options.prefix || "处理中：";
        this.suffix = options.suffix || "完成";
    }

    /**
     * 更新进度（每完成一个任务调用一次）
     * @param step 单次增加的进度（默认1）
     */
    update(step = 1) {
        this.current = Math.min(this.total, this.current + step);
        this.render();
    }

    /**
     * 强制渲染进度条（内部使用）
     */
    private render() {
        const progress = this.current / this.total; // 0-1 进度
        const percent = Math.round(progress * 100); // 百分比
        const fillLength = Math.round(progress * this.barLength); // 填充长度
        const emptyLength = this.barLength - fillLength; // 空白长度

        // 构造进度条字符串
        const bar = `${this.fillChar.repeat(fillLength)}${this.emptyChar.repeat(emptyLength)}`;
        const output = `${this.prefix} [${bar}] ${percent}% (${this.current}/${this.total})`;

        // 写入终端（原地更新）
        Deno.stdout.writeSync(new TextEncoder().encode(`\x1B[0G\x1B[K${output}`));
    }

    /**
     * 完成进度（最后调用，换行收尾）
     */
    finish() {
        // 确保进度条满格
        this.current = this.total;
        this.render();
        // 换行，避免影响后续输出
        Deno.stdout.writeSync(new TextEncoder().encode(`\n${this.suffix}！\n`));
    }
}

/**
 * 简化版：仅显示百分比进度（无进度条）
 */
export class PercentProgress {
    private total: number;
    private current = 0;

    constructor(total: number) {
        this.total = total;
    }

    update(step = 1) {
        this.current = Math.min(this.total, this.current + step);
        const percent = Math.round((this.current / this.total) * 100);
        // 仅显示百分比和计数
        Deno.stdout.writeSync(
            new TextEncoder().encode(`\x1B[0G\x1B[K处理进度：${percent}%（${this.current}/${this.total}）`)
        );
    }

    finish() {
        Deno.stdout.writeSync(new TextEncoder().encode(`\n处理完成！\n`));
    }
}