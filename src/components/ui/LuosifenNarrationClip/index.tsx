import React, { useRef } from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { gsap, useGSAP } from "../../../editor/gsap-setup";

/**
 * 螺蛳粉解说组件 - 14 段落卡片随帧切换
 *
 * GSAP 安全用法：
 *   1. timeline { paused: true }，由 useCurrentFrame 映射进度驱动
 *   2. 被 GSAP 管理的属性（transform/opacity）React 不重复设置
 *   3. timeline 只在参数变化时重建；frame 变化只 seek
 *   4. 14 个段落卡片随帧切换，每段淡入淡出
 */

// 14 个段落内容（基于原文拆解）
const PARAGRAPHS = [
  {
    id: 1,
    title: "数据钩子",
    icon: "📊",
    points: [
      "实体店已达 5.1 万家",
      "类比沙县小吃近 10 万家店",
      "蜜雪冰城内地门店 5.5 万家",
      "大街小巷随处可见",
      "从小众单品跃升为国民品类"
    ]
  },
  {
    id: 2,
    title: "权威数据",
    icon: "💰",
    points: [
      "2025年全产业链收入 813 亿元",
      "预包装螺蛳粉 163 亿元",
      "实体店 434 亿元",
      "配套及衍生产业 216.1 亿元",
      "柳州市商务局官方数据"
    ]
  },
  {
    id: 3,
    title: "核心设问",
    icon: "❓",
    points: [
      "为什么螺蛳粉能产业化？",
      "地方小吃如何成为国民品类？",
      "驱动全篇叙事的主问题"
    ]
  },
  {
    id: 4,
    title: "起源背景",
    icon: "🏭",
    points: [
      "柳州：西南工业重镇",
      "全国五大汽车生产基地之一",
      "国民神车五菱、机械龙头柳工",
      "太依赖重工业，经济缺乏韧性",
      "急需轻产业平衡"
    ]
  },
  {
    id: 5,
    title: "早期试水",
    icon: "🚂",
    points: [
      "2010年：螺蛳粉进京项目",
      "鼓励商家去北上广深开店",
      "特色食材只能空运，成本高",
      "外地人认知不足",
      "并未大规模出圈"
    ]
  },
  {
    id: 6,
    title: "破圈引爆",
    icon: "📺",
    points: [
      "2012年：《舌尖上的中国》走进广西",
      "闻着臭吃着香的米粉走进大众视野",
      "福建商人姚翰林嗅到商机",
      "关键转折点"
    ]
  },
  {
    id: 7,
    title: "产业萌芽",
    icon: "📦",
    points: [
      "2014年：螺霸王袋装螺蛳粉诞生",
      "袋装技术成熟",
      "2014年阿里巴巴上市",
      "2015年拼多多上线",
      "电商繁荣+创业时代双红利"
    ]
  },
  {
    id: 8,
    title: "供应链成熟",
    icon: "🔗",
    points: [
      "上游：稻米、竹笋、淡水螺养殖",
      "中游：配料预处理、包装组装",
      "供应链反哺实体店",
      "为线下扩张提供基础"
    ]
  },
  {
    id: 9,
    title: "网红经济",
    icon: "📱",
    points: [
      "李子柒螺蛳粉视频播放量破千万",
      "李佳琦等头部主播带货",
      "「臭」自带社交叙事",
      "完成大众认知教育",
      "反哺线下实体店"
    ]
  },
  {
    id: 10,
    title: "线下连锁",
    icon: "🏪",
    points: [
      "肥姨妈：1100+ 门店",
      "荣柳大铁牛：2000+ 门店",
      "加盟模式全国扩张",
      "正在打造螺蛳粉帝国"
    ]
  },
  {
    id: 11,
    title: "适应性分析",
    icon: "🍜",
    points: [
      "各地接受程度高",
      "配料丰富，兼容性强",
      "北方降低辣度、弱化臭味",
      "衍生干捞、骨汤、鹿茸菌、麻酱等新品",
      "地方小吃改良成融合菜"
    ]
  },
  {
    id: 12,
    title: "价位与门槛",
    icon: "🏷️",
    points: [
      "黄金价位：15-25 元",
      "盖饭太干、面条太淡",
      "性价比之王",
      "标准化降低厨师门槛",
      "煮粉加配料包即可开店"
    ]
  },
  {
    id: 13,
    title: "文旅延伸",
    icon: "🚌",
    points: [
      "螺蛳粉专列公交",
      "2路、92路经十余家网红店",
      "94路直达产业园、博物馆",
      "产业→城市名片",
      "一站式文旅体验"
    ]
  },
  {
    id: 14,
    title: "升华反转",
    icon: "🎯",
    points: [
      "2018年政府出台产业规划",
      "细到种多少亩笋和豆角",
      "汤底螺丝在哪养、在哪种都想好",
      "运气+操盘",
      "成功并非偶然"
    ]
  }
];

interface LuosifenNarrationClipProps {
  /** 每段落持续帧数 */
  readonly framesPerParagraph?: number;
  /** 段落切换淡入淡出帧数 */
  readonly fadeFrames?: number;
  /** 左上角卡片背景色 */
  readonly leftCardColor?: string;
  /** 右上角卡片背景色 */
  readonly rightCardColor?: string;
  /** 文字颜色 */
  readonly textColor?: string;
  /** 高亮颜色 */
  readonly accentColor?: string;
  /** 卡片透明度（0-1） */
  readonly cardOpacity?: number;
  /** 是否启用 GSAP 动画 */
  readonly enableGsapAnimation?: number;
  /** 视频宽度（兜底） */
  readonly videoWidth?: number;
  /** 视频高度（兜底） */
  readonly videoHeight?: number;
}

export const LuosifenNarrationClip: React.FC<LuosifenNarrationClipProps> = ({
  framesPerParagraph = 150,
  fadeFrames = 15,
  leftCardColor = "rgba(0, 0, 0, 0.78)",
  rightCardColor = "rgba(20, 20, 30, 0.78)",
  textColor = "#ffffff",
  accentColor = "#ff6b35",
  cardOpacity = 1,
  enableGsapAnimation = 1,
  videoWidth = 1920,
  videoHeight = 1080,
}) => {
  const frame = useCurrentFrame();
  const vcfg = useVideoConfig();
  const width = vcfg.width || videoWidth;
  const height = vcfg.height || videoHeight;

  // 计算当前段落索引（0-13）
  const totalParas = PARAGRAPHS.length;
  const currentParaIndex = Math.min(
    Math.floor(frame / framesPerParagraph),
    totalParas - 1
  );
  const currentPara = PARAGRAPHS[currentParaIndex];

  // 当前段落内的帧偏移
  const frameInPara = frame - currentParaIndex * framesPerParagraph;

  // 淡入淡出进度（0=完全透明，1=完全显示）
  const fadeProgress = interpolate(
    frameInPara,
    [0, fadeFrames, framesPerParagraph - fadeFrames, framesPerParagraph],
    [0, 1, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  // 左上角卡片 ref
  const leftCardRef = useRef<HTMLDivElement>(null);
  const leftContentRef = useRef<HTMLDivElement>(null);
  // 右上角卡片 ref
  const rightCardRef = useRef<HTMLDivElement>(null);
  const rightContentRef = useRef<HTMLDivElement>(null);
  // 进度条 ref
  const progressRef = useRef<HTMLDivElement>(null);

  const tlRef = useRef<gsap.core.Timeline | null>(null);

  // ① timeline 重建（仅在参数变化时）
  useGSAP(
    () => {
      if (!leftCardRef.current || !rightCardRef.current) return;

      const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });

      // 左上角：滑入 + 淡入
      tl.fromTo(
        leftCardRef.current,
        { x: -80, opacity: 0 },
        { x: 0, opacity: cardOpacity, duration: 0.3 },
        0
      );

      // 右上角：滑入 + 淡入
      tl.fromTo(
        rightCardRef.current,
        { x: 80, opacity: 0 },
        { x: 0, opacity: cardOpacity, duration: 0.3 },
        0
      );

      // 左上角内容：缩放 + 淡入
      if (leftContentRef.current) {
        tl.fromTo(
          leftContentRef.current,
          { scale: 0.9, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.25 },
          0.1
        );
      }

      // 右上角内容：缩放 + 淡入
      if (rightContentRef.current) {
        tl.fromTo(
          rightContentRef.current,
          { scale: 0.9, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.25 },
          0.1
        );
      }

      tlRef.current = tl;
      return () => {
        tl.kill();
        tlRef.current = null;
      };
    },
    {
      dependencies: [cardOpacity, enableGsapAnimation, currentParaIndex],
    }
  );

  // ② 每帧 seek：用淡入淡出进度驱动 timeline
  useGSAP(
    () => {
      if (!enableGsapAnimation) return;
      if (!tlRef.current) return;

      // timeline 前半段是入场动画（0~0.5），后半段保持
      // 用 fadeProgress 映射到 timeline 进度
      const tlProgress = Math.min(fadeProgress * 2, 1);
      tlRef.current.progress(tlProgress);

      // 进度条
      if (progressRef.current) {
        const overallProgress = ((currentParaIndex + fadeProgress) / totalParas) * 100;
        gsap.to(progressRef.current, {
          width: `${overallProgress}%`,
          duration: 0,
        });
      }
    },
    { dependencies: [frame, fadeProgress, currentParaIndex, enableGsapAnimation] }
  );

  // 左上角卡片样式
  const leftCardStyle: React.CSSProperties = {
    position: "absolute",
    top: "40px",
    left: "40px",
    width: "360px",
    backgroundColor: leftCardColor,
    borderRadius: "16px",
    padding: "24px",
    backdropFilter: "blur(12px)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    willChange: "transform, opacity",
  };

  // 右上角卡片样式
  const rightCardStyle: React.CSSProperties = {
    position: "absolute",
    top: "40px",
    right: "40px",
    width: "420px",
    backgroundColor: rightCardColor,
    borderRadius: "16px",
    padding: "24px",
    backdropFilter: "blur(12px)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    willChange: "transform, opacity",
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent" }}>
      {/* 左上角：段落编号 + 标题 */}
      <div ref={leftCardRef} style={leftCardStyle}>
        <div ref={leftContentRef} style={{ willChange: "transform, opacity" }}>
          {/* 段落编号 */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              marginBottom: "16px",
            }}
          >
            <span
              style={{
                fontSize: "48px",
                fontWeight: 800,
                color: accentColor,
                fontFamily: "ui-monospace, monospace",
                lineHeight: 1,
              }}
            >
              {String(currentPara.id).padStart(2, "0")}
            </span>
            <span
              style={{
                fontSize: "20px",
                color: textColor,
                opacity: 0.5,
                marginLeft: "4px",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              / 14
            </span>
          </div>

          {/* 段落标题 */}
          <div
            style={{
              fontSize: "24px",
              fontWeight: 700,
              color: textColor,
              marginBottom: "12px",
              paddingBottom: "12px",
              borderBottom: `2px solid ${accentColor}`,
            }}
          >
            {currentPara.icon} {currentPara.title}
          </div>

          {/* 段落进度条 */}
          <div
            style={{
              display: "flex",
              gap: "3px",
              marginTop: "8px",
            }}
          >
            {PARAGRAPHS.map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: "4px",
                  borderRadius: "2px",
                  backgroundColor:
                    i < currentParaIndex
                      ? accentColor
                      : i === currentParaIndex
                        ? accentColor
                        : "rgba(255,255,255,0.15)",
                  opacity:
                    i < currentParaIndex
                      ? 0.6
                      : i === currentParaIndex
                        ? 1
                        : 0.3,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 右上角：段落内容卡片 */}
      <div ref={rightCardRef} style={rightCardStyle}>
        <div ref={rightContentRef} style={{ willChange: "transform, opacity" }}>
          {/* 要点标题 */}
          <div
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: textColor,
              opacity: 0.7,
              marginBottom: "16px",
              letterSpacing: 1,
            }}
          >
            KEY POINTS
          </div>

          {/* 要点列表 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {currentPara.points.map((point, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  padding: "10px 14px",
                  backgroundColor: "rgba(255, 255, 255, 0.06)",
                  borderRadius: "8px",
                  borderLeft: "3px solid",
                  borderLeftColor: i === 0 ? accentColor : "transparent",
                }}
              >
                <span
                  style={{
                    fontSize: "14px",
                    color: accentColor,
                    marginRight: "8px",
                    fontWeight: 700,
                    fontFamily: "ui-monospace, monospace",
                    minWidth: "20px",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  style={{
                    fontSize: "15px",
                    color: textColor,
                    lineHeight: 1.5,
                  }}
                >
                  {point}
                </span>
              </div>
            ))}
          </div>

          {/* 总进度条 */}
          <div
            style={{
              marginTop: "20px",
              paddingTop: "16px",
              borderTop: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "12px",
                color: textColor,
                opacity: 0.5,
                marginBottom: "6px",
              }}
            >
              <span>进度</span>
              <span>
                {currentParaIndex + 1} / {totalParas}
              </span>
            </div>
            <div
              style={{
                height: "3px",
                backgroundColor: "rgba(255,255,255,0.15)",
                borderRadius: "2px",
                overflow: "hidden",
              }}
            >
              <div
                ref={progressRef}
                style={{
                  height: "100%",
                  width: "0%",
                  backgroundColor: accentColor,
                  borderRadius: "2px",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};