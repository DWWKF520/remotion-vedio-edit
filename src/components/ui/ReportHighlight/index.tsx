import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/**
 * 政府公文 · 「逐字扫红 + 镜头缓推」
 *
 * 排版一份 gov.cn 风格的政策文件（宋体、居中标题、首行缩进 2em、justify），
 * 用户可以粘贴任意一句要"扫红"的话（highlightText），组件会在正文里查找
 * 该字串并从左到右逐字点亮红色背景，同时镜头以 ease-out 缓动推近。
 *
 * 默认内容取自：
 *   国务院办公厅《关于进一步促进民间投资发展的若干措施》的通知
 *   （国办发〔2025〕38号，2025-11-03）
 *   https://www.gov.cn/zhengce/zhengceku/202511/content_7047644.htm
 */

// 宋体/衬线字体栈，模拟政府公文样式
const FONT_SERIF =
  "'SimSun', '宋体', 'Songti SC', 'Source Han Serif SC', 'Noto Serif CJK SC', 'Times New Roman', serif";

const FONT_HEI =
  "'SimHei', '黑体', 'Heiti SC', 'Source Han Sans SC', 'Noto Sans CJK SC', 'PingFang SC', 'Microsoft YaHei', sans-serif";

// ====== 默认文本：国务院办公厅 〔2025〕38 号 通知 + 若干措施 ======
const DEFAULT_TITLE =
  "国务院办公厅印发《关于进一步促进民间投资发展的若干措施》的通知";
const DEFAULT_DOC_NUMBER = "国办发〔2025〕38号";
const DEFAULT_RECIPIENT =
  "各省、自治区、直辖市人民政府，国务院各部委、各直属机构：";
const DEFAULT_NOTICE_BODY =
  "《关于进一步促进民间投资发展的若干措施》已经国务院同意，现印发给你们，请认真贯彻执行。";
const DEFAULT_NOTICE_SIGNATURE = "国务院办公厅\n2025年11月3日\n（此件公开发布）";

const DEFAULT_SECTION_TITLE = "关于进一步促进民间投资发展的若干措施";
const DEFAULT_SECTION_INTRO =
  "为进一步激发民间投资活力、促进民间投资发展，现提出如下措施。";

// 13 条 + 收尾段，用 \n 分段
const DEFAULT_SECTION_BODY = `一、对需报国家审批（核准）的具有一定收益的铁路、核电、水电、跨省跨区直流输电通道、油气管道、进口液化天然气接收和储运设施、供水等领域项目，应专项论证民间资本参与的可行性，并在可行性研究报告（项目申请书）中专项说明。鼓励支持民间资本参与，并结合项目实际、民营企业参与意愿、有关政策要求等确定具体项目持股比例。对具备条件的项目，民间资本持股比例可在10%以上。
二、行业主管部门和各地方结合实际细化民间资本参与项目建设的具体要求，由项目审批（核准）部门按权限审核民间资本参与情况、确定持股比例。对各地方规模较小、具有盈利空间的城市基础设施领域新建项目，鼓励民间资本参与建设运营。
三、引导民间资本有序参与低空经济领域基础设施建设。在商业航天频率许可、发射审批过程中，一视同仁对待民间投资项目，优化卫星通信业务准入政策。加快公布向民营企业开放的国家重大科研基础设施清单并动态更新，积极支持有能力的民营企业牵头承担国家重大技术攻关任务。
四、清理不合理的服务业经营主体准入限制，严禁在环保、卫生、安保、质检、消防等方面的准入条件之外违规设置障碍。支持民间资本更多投向工业设计、共性技术服务、检验检测、质量认证、数字化转型等生产性服务业领域。
五、规范实施政府和社会资本合作新机制，修订分类支持民营企业参与的特许经营项目清单，在特许经营方案、招标文件等材料中合理设置民间资本参与的要求和条件，严格特许经营方案审核，加强监督管理。
六、严格落实招标投标领域相关制度规定，严禁对民营企业违规设置设立分公司或子公司、强制加入协会等附加条件，坚决取消对民营企业单独设置的历史业绩、资质等不合理要求。
七、进一步加大政府采购支持中小企业力度。对超过400万元的工程采购项目中适宜由中小企业提供的，严格按规定预留该部分采购项目预算总额的40%以上专门面向中小企业采购，鼓励地方政府结合实际进一步提高预留份额。鼓励采购单位将对民营企业的合同预付款比例提高至合同金额的30%以上。
八、加强对网络型基础设施运行调度的监管，保障民营企业在电力并网运行、油气管网设施使用、运力资源调配等方面的合法权益。加快制定出台铁路线路接轨管理办法，规范简化铁路线路接轨手续并公开有关要求，支持有条件的铁路项目实行管内自主运输调度，完善铁路线路路网使用费等方面财务清算规则。深化基础设施和公用事业领域价格改革。
九、围绕重点领域和重点产业链，鼓励支持民营企业加快建设一批具有较强行业带动力的重大中试平台，支持国有企业、高等院校、科研院所面向民营企业提供市场化中试服务，探索简化优化中试基地项目建设前置要件审批程序。
十、支持民营龙头企业、链主企业、第三方服务商建设综合性数字赋能平台，打通产业链供应链数据堵点，开展跨领域数据融合应用，带动上下游中小企业协同数字化转型。加快培育一批面向民营中小企业的数字化服务商，深入实施中小企业数字化赋能专项行动，支持更多民营中小企业加快数字化升级改造。
十一、加大中央预算内投资对符合条件民间投资项目的支持力度，积极发挥引导带动作用。用好新型政策性金融工具，支持一批符合条件的重要行业、重点领域民间投资项目，补充项目资本金。
十二、用好支持小微企业融资协调工作机制。银行业金融机构应制定民营企业年度服务目标，全面准确落实普惠信贷尽职免责和不良容忍制度，完善内部实施细则，满足民营企业合理信贷需求。打造国家投融资综合服务平台，加强与全国融资信用服务等平台互联互通，更加精准投放信贷资源。推广“创新积分制”，引导金融资源精准聚焦服务科技型企业。
十三、持续落实好突破关键核心技术科技型企业上市融资、并购重组“绿色通道”政策。积极支持更多符合条件的民间投资项目发行基础设施领域不动产投资信托基金（REITs）。`;

const DEFAULT_SECTION_CLOSING =
  "各地区、各有关部门要加强对民间投资的服务、指导和规范管理，健全民间投资统计制度，加强民间投资监测分析，引导民营企业诚信守法经营，科学进行投资决策，积极履行社会责任，切实防范各类风险，促进民间投资高质量发展。国家发展改革委要会同有关方面加强政策指导、统筹协调、督促落实。重要情况及时按程序请示报告。";

// 默认扫红的句子（第 12 条里的一句话）
const DEFAULT_HIGHLIGHT_TEXT = "推广“创新积分制”，引导金融资源精准聚焦服务科技型企业";

// ====== 工具：hex → {r,g,b} ======
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return { r: 229, g: 57, b: 53 };
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export const ReportHighlight: React.FC<{
  // ====== 文案（gov.cn 公文结构）======
  readonly articleTitle?: string;
  readonly documentNumber?: string;
  readonly recipientText?: string;
  readonly noticeBody?: string;
  readonly noticeSignature?: string;

  readonly sectionTitle?: string;
  readonly sectionIntro?: string;
  /** 二级标题下的正文（多段用 \n 分隔） */
  readonly sectionBody?: string;
  readonly sectionClosing?: string;

  /**
   * 要"扫红"的那一句（必须能在某一段正文里整段匹配）
   * 例如："推广"创新积分制"，引导金融资源精准聚焦服务科技型企业"
   */
  readonly highlightText?: string;

  // ====== 扫描（逐字标红）======
  readonly scanStartFrame?: number;
  readonly scanDuration?: number;
  readonly scanColor?: string;
  readonly scanMaxOpacity?: number;

  // ====== 镜头缓推（页面缩放）======
  readonly zoomStartFrame?: number;
  readonly zoomDuration?: number;
  readonly zoomScale?: number;

  // ====== 排版样式 ======
  readonly pageBackgroundColor?: string;
  readonly paperColor?: string;
  readonly textColor?: string;
  readonly accentColor?: string;
  readonly titleFontSize?: number;
  readonly documentNumberFontSize?: number;
  readonly recipientFontSize?: number;
  readonly bodyFontSize?: number;
  readonly sectionTitleFontSize?: number;
  readonly signatureFontSize?: number;
  readonly pagePadding?: number;
}> = ({
  articleTitle = DEFAULT_TITLE,
  documentNumber = DEFAULT_DOC_NUMBER,
  recipientText = DEFAULT_RECIPIENT,
  noticeBody = DEFAULT_NOTICE_BODY,
  noticeSignature = DEFAULT_NOTICE_SIGNATURE,

  sectionTitle = DEFAULT_SECTION_TITLE,
  sectionIntro = DEFAULT_SECTION_INTRO,
  sectionBody = DEFAULT_SECTION_BODY,
  sectionClosing = DEFAULT_SECTION_CLOSING,

  highlightText = DEFAULT_HIGHLIGHT_TEXT,

  scanStartFrame = 0,
  scanDuration = 60,
  scanColor = "#e53935",
  scanMaxOpacity = 0.55,

  zoomStartFrame = 0,
  zoomDuration = 60,
  zoomScale = 1.6,

  pageBackgroundColor = "#ececec",
  paperColor = "#ffffff",
  textColor = "#000000",
  accentColor = "#c0392b",
  titleFontSize = 30,
  documentNumberFontSize = 20,
  recipientFontSize = 20,
  bodyFontSize = 19,
  sectionTitleFontSize = 26,
  signatureFontSize = 18,
  pagePadding = 60,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // 镜头缓推
  const zoomProgress = interpolate(
    frame,
    [zoomStartFrame, zoomStartFrame + zoomDuration],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    },
  );
  const scale = interpolate(zoomProgress, [0, 1], [1, zoomScale]);

  // 扫描进度（线性）
  const scanProgress = interpolate(
    frame,
    [scanStartFrame, scanStartFrame + scanDuration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const scanRgb = hexToRgb(scanColor);

  // 渲染被扫红的那个字串（逐字背景从透明到红）
  // 关键：保持 inline，不加 padding/margin/lineHeight，避免把整行字距撑大
  const renderScanSpan = (text: string) => {
    const chars = Array.from(text);
    const total = chars.length || 1;
    return (
      <>
        {chars.map((ch, i) => {
          const start = i / total;
          const end = (i + 1) / total;
          const local = Math.max(
            0,
            Math.min(1, (scanProgress - start) / (end - start)),
          );
          const alpha = local * scanMaxOpacity;
          return (
            <span
              key={i}
              style={{
                // 只设背景色，紧贴每个字；不设 display / padding / margin
                backgroundColor: `rgba(${scanRgb.r}, ${scanRgb.g}, ${scanRgb.b}, ${alpha})`,
                color: textColor,
              }}
            >
              {ch === " " ? "\u00A0" : ch}
            </span>
          );
        })}
      </>
    );
  };

  // 渲染一段正文：若包含 highlightText 则把命中部分替换成扫红 span
  const renderParagraph = (text: string) => {
    if (!highlightText || !text.includes(highlightText)) {
      return <>{text}</>;
    }
    const idx = text.indexOf(highlightText);
    const before = text.slice(0, idx);
    const after = text.slice(idx + highlightText.length);
    return (
      <>
        {before}
        {renderScanSpan(highlightText)}
        {after}
      </>
    );
  };

  // 落款多行：按 \n 拆分，右对齐
  const renderSignature = (text: string) => {
    return (
      <div
        style={{
          textAlign: "right",
          fontSize: signatureFontSize,
          lineHeight: 1.7,
          color: textColor,
          fontFamily: FONT_SERIF,
        }}
      >
        {text.split("\n").map((line, i) => (
          <div key={i}>{line || "\u00A0"}</div>
        ))}
      </div>
    );
  };

  // 段落（多段用 \n 分隔），每段首行缩进 2em，text-align: justify
  const renderBodyBlock = (text: string, baseStyle: React.CSSProperties) => {
    const paras = text.split("\n").filter((p) => p.trim().length > 0);
    return (
      <>
        {paras.map((p, i) => (
          <p
            key={i}
            style={{
              ...baseStyle,
              // 关键：首行缩进 2em（公文标准）
              textIndent: "2em",
              margin: 0,
              marginBottom: 4,
            }}
          >
            {renderParagraph(p)}
          </p>
        ))}
      </>
    );
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: pageBackgroundColor,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: FONT_SERIF,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: width - pagePadding * 2,
          height: height - pagePadding * 2,
          backgroundColor: paperColor,
          padding: `${pagePadding * 0.9}px ${pagePadding * 1.5}px`,
          // 红色公文边线
          borderTop: `3px solid ${accentColor}`,
          borderBottom: `3px solid ${accentColor}`,
          display: "flex",
          flexDirection: "column",
          // 镜头缩放
          transform: `scale(${scale})`,
          transformOrigin: "50% 50%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        {/* ===== 通知部分 ===== */}
        <h1
          style={{
            textAlign: "center",
            fontSize: titleFontSize,
            color: textColor,
            fontFamily: FONT_HEI,
            fontWeight: 700,
            margin: 0,
            marginTop: 10,
            lineHeight: 1.4,
            letterSpacing: 1,
          }}
        >
          {articleTitle}
        </h1>

        <div
          style={{
            textAlign: "center",
            fontSize: documentNumberFontSize,
            color: textColor,
            fontFamily: FONT_SERIF,
            marginTop: 14,
            marginBottom: 18,
          }}
        >
          {documentNumber}
        </div>

        <div
          style={{
            fontSize: recipientFontSize,
            color: textColor,
            fontFamily: FONT_SERIF,
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          {recipientText}
        </div>

        {renderBodyBlock(noticeBody, {
          fontSize: bodyFontSize,
          lineHeight: 1.8,
          color: textColor,
          textAlign: "justify",
        })}

        <div style={{ marginTop: 10, marginBottom: 4 }}>
          {renderSignature(noticeSignature)}
        </div>

        {/* 顶部红色分隔线（公文常见） */}
        <div
          style={{
            height: 2,
            backgroundColor: accentColor,
            margin: "20px 0",
            borderRadius: 1,
          }}
        />

        {/* ===== 措施部分（焦点区） ===== */}
        <h2
          style={{
            textAlign: "center",
            fontSize: sectionTitleFontSize,
            color: textColor,
            fontFamily: FONT_HEI,
            fontWeight: 700,
            margin: 0,
            marginBottom: 14,
            lineHeight: 1.4,
          }}
        >
          {sectionTitle}
        </h2>

        {renderBodyBlock(sectionIntro, {
          fontSize: bodyFontSize,
          lineHeight: 1.8,
          color: textColor,
          textAlign: "justify",
        })}

        <div
          style={{
            marginTop: 10,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
          }}
        >
          {renderBodyBlock(sectionBody, {
            fontSize: bodyFontSize,
            lineHeight: 1.8,
            color: textColor,
            textAlign: "justify",
          })}

          {renderBodyBlock(sectionClosing, {
            fontSize: bodyFontSize,
            lineHeight: 1.8,
            color: textColor,
            textAlign: "justify",
            marginTop: 6,
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
