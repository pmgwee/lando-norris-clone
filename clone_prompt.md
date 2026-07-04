https://haoqi.design/ 是我的个人网站，但我现在因电脑硬盘损坏丢失了源码，
只留下了已经部署上线的生产环境下的网站。现在我们的任务就是：1:1 还原当前项目代码，
最终复刻效果必须与线上生产环境在视觉与动效上达成一致。

你可以充分利用如下能力（三者分工，勿混淆）：
- Playwright MCP 或 @Browser：访问 / 截图 / 录屏 / 识别 / 探索 网站的视觉与代码、抓取资源
- Context7 MCP：查询涉及框架/库的技术文档
- /design-dna：把线上站点（URL + 多视角截图）逆向成一份结构化的 Design DNA JSON
  （设计系统 token：色彩/字体/间距/版式/形状/层级/动效曲线/断点；设计风格：情绪/视觉语言/
   构图/交互气质/品牌语气；视觉特效清单）。这份 JSON 是整个项目的【设计真值 / 单一事实源】。
- /web-shader-extractor：针对 WebGL/Canvas/shader/滚动驱动动效等"超出普通 CSS"的部分，
  逆向出可本地运行的实现与证据。它与 design-dna 的"视觉特效"维度互补——
  DNA 给规格，extractor 给可跑的代码。

关于分析（重大复杂工程，上下文有限，务必先落盘再施工）：
1) 全局探索与取证：用 Playwright 全站截图（桌面+移动、首屏+各滚动区段、暗/亮态），
   抓取资源与模块清单 → 落盘 docs/module-inventory.md。
2) 全局提取 Design DNA：把线上 URL 与截图交给 /design-dna（Analyze 阶段），
   产出字段齐全、无量化的 docs/design-dna.json，提交版本管理。
   —— 之后任何模块的颜色/字号/间距/缓动/断点，一律以这份 JSON 为准，不得凭感觉。
3) 动效模块逆向：对每个含特效的模块，用 /web-shader-extractor 产出
   docs/effects/<模块>.md（含着色器/资源/渲染图/时序/输入证据 + 本地可跑基线）。
4) 模块化重建：按 module-inventory 的依赖顺序逐个实现；每个模块开工前，用 /duck
   把"这个模块的数据流/状态/动效触发条件"像对新手一样逐层讲一遍，暴露隐藏假设。
   实现时严格对照 design-dna.json 取 token、对照 effects/<模块>.md 还原动效。
5) 落盘优先：每个模块的分析与实现结论都写进本地 docs/，即便上下文被压缩，
   后续也能凭本地文档无损续接。

关于结果验证（你要有充分自主能动性，闭环到"看起来一致"为止）：
- 自运行项目 → 用 Playwright 在与原站相同的视口/滚动位置截图 → 并排比对原站截图。
- 以 design-dna.json 为量化判据：逐项核对色彩、字阶、间距、层级、动效曲线、特效清单；
  以 effects/<模块>.md 为动效判据：核对粒子/着色器/滚动行为是否与原站一致。
- 触发 /design-dna 的【精修轮次】：把"同一批原站截图/URL"再次喂给智能体，
  要求其"对照参考复审界面层级与点缀、字阶与留白、动效与材质及整体 UI，并将结论回填实现"，
  在保留初稿的前提下逐轮拉近差距，无需从零重做。
- 把每轮比对结果与差距记录写进 docs/verify/<模块>.md，迭代直至与线上生产环境一致。

可以参考我上传的录屏来增强画面元素链接动效的理解


## Continue 
继续按照你认为合适的顺序继续完成，知道所有完成

## Git
我要把这个project 放在我的github repository :https://github.com/pmgwee/lando-norris-clone.git


## Deployment
我现在要把这个project 用vercel deploy这个网站

Tech stack : Vite 或者Next.js ,React,Typescript,GASP/react,Tailwind CSS

Tech stack 可以根据这个project的需求改动

## Rebranding

so they jiu sell (Code template that got font,color,effects,layouts,motion animate keyframe+ Video source as assets = GSAP /framer motion hero scrolling landing page prompt)
and they jiu upsell with the video they uploaded to cloud platform  for people can use in their project with just url