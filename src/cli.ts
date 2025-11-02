import {
  bgBlue,
  bgMagenta,
  magenta,
} from "https://deno.land/std@0.192.0/fmt/colors.ts";

// 显示欢迎界面
export const showWelcome = () => {
  console.clear();

  // 赛博朋克风格标题
  console.log(bgMagenta("FIRE CLOUD SCORING"));
  console.log(bgBlue(" ".repeat(80)));

  console.log(`${magenta(">>")} Welcome To FireCloud Rating Tool v2.0 ${magenta("<<")}`);
};
