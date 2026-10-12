import type { Article, RichNode } from "./types";

const paragraph = (text: string): RichNode => ({ type: "paragraph", content: [{ type: "text", text }] });
const heading = (text: string): RichNode => ({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text }] });
const image = (storageKey: string, alt: string, caption: string): RichNode => ({ type: "image", attrs: { storageKey, alt, caption } });

export const demoPosts: Article[] = [
  {
    id: "demo-picnic", slug: "strawberry-afternoon", title: "今天的风，是草莓味的。", category: "日常碎片", publishedAt: "2026-05-18T08:00:00Z", coverKey: "/assets/picnic.svg", demo: true,
    excerpt: "我们带了草莓和那块格子布。你认真观察一只蚂蚁，我慢慢翻书。没有什么特别的事，但真想把这个下午装进口袋。",
    content: { type: "doc", content: [
      heading("一个普通的好下午"),
      paragraph("出门的时候，太阳正好落在门口。我们带了洗好的草莓、一本还没有读完的书，还有那块粉色格子布。没有安排什么，只是想在草地上坐一会儿。"),
      paragraph("你发现一只小蚂蚁，蹲下来跟着它走了好长一段路。你问，它是不是也要回家吃草莓？我说，也许它正在找属于自己的小小午餐。"),
      { type: "blockquote", content: [paragraph("有些下午没有发生大事，却会在心里留下很久。") ] },
      heading("把小事情留下"),
      image("/assets/meadow.svg", "青草地上开着细小的花", "风经过草地，也经过我们的书页。"),
      paragraph("后来我们把最后两颗草莓分着吃掉。你的手指上沾了一点红色，裙摆上也带回几片草叶。我想记住的，大概就是这样很小、很小的事情。"),
      { type: "video", attrs: { storageKey: "/assets/afternoon.mp4", poster: "/assets/video-poster.png", alt: "示例：阳光下的午后片刻", caption: "收进手帐的三秒钟 · 示例短片" } },
      heading("写给以后的你"),
      paragraph("等你长大，也许不会记得这一天。不过没关系，我们可以一起翻回这一页。我会告诉你：那天风很轻，草莓很甜，而你一直在笑。"),
    ] },
  },
  {
    id: "demo-meadow", slug: "flowers-on-the-way", title: "你说，春天是一种颜色。", category: "慢慢长大", publishedAt: "2026-05-14T08:00:00Z", coverKey: "/assets/meadow.svg", demo: true,
    excerpt: "走回家的路上，你给每一朵小花起了名字。原来春天除了绿色，还有好多只有你看得见的颜色。",
    content: { type: "doc", content: [heading("路边的小花"), paragraph("今天走得很慢。因为你发现路边的每一朵花都不一样，需要停下来认真认识它。黄色的是小太阳，白色的是云朵，粉色的是送给妈妈的。"), image("/assets/meadow.svg", "浅绿的草地和盛开的小花", "你眼睛里的春天，比地图上的更大。"), heading("慢慢就很好"), paragraph("回家的路只有一小段，我们却走了很久。没关系，日子有时候就是应该这样，留一点空白，给新的发现。") ] },
  },
  {
    id: "demo-sea", slug: "a-letter-from-the-sea", title: "寄一封信，给蓝色的大海。", category: "出去走走", publishedAt: "2026-05-10T08:00:00Z", coverKey: "/assets/sea.svg", demo: true,
    excerpt: "你把贝壳放在耳边，说听见了海浪回信。我们踩着湿湿的沙，一起等下一阵风。",
    content: { type: "doc", content: [heading("海边的信箱"), paragraph("你把今天捡到的贝壳排成一行，说这是大海寄来的信。每一只贝壳里，都住着一句不一样的话。"), image("/assets/sea.svg", "浅蓝色大海与海边的阳光", "这里的蓝色，值得装进口袋。"), { type: "blockquote", content: [paragraph("走远一点，也还是可以找到小小的快乐。") ] }, heading("带回家的声音"), paragraph("我们没有带走很多东西。一只贝壳、一点沙，还有风吹过时你很开心的样子，就够了。") ] },
  },
  {
    id: "demo-window", slug: "rain-at-the-window", title: "下雨天，就在窗边发会儿呆。", category: "日常碎片", publishedAt: "2026-05-06T08:00:00Z", coverKey: "/assets/window.svg", demo: true,
    excerpt: "雨滴一颗一颗落在玻璃上。我们没有出门，只给家里的小植物浇了水，又喝掉一杯温温的牛奶。",
    content: { type: "doc", content: [heading("不用出门的一天"), paragraph("雨落下来的时候，我们一起搬了两把椅子到窗边。你数雨滴，我看小植物。偶尔什么都不做，也是一种很好的一起。"), image("/assets/window.svg", "窗边的小植物与柔和光线", "下雨也有下雨的好。"), paragraph("今天的日记没有很长。就记一件事：窗外有雨，屋子里有你，已经很暖。") ] },
  },
];
