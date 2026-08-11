import { expect, test, type Page } from "@playwright/test";

const STORAGE_KEY = "zhoumapo-manager-assistant-v4";

async function resetDemo(page: Page) {
  await page.goto("/");
  await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY);
  await page.reload();
}

async function waitForMock(page: Page) {
  await page.waitForTimeout(820);
}

async function jumpToMoment(page: Page, time: string) {
  const nav = page.getByRole("navigation", { name: "主要功能" });
  await nav.getByRole("button", { name: "我的" }).click();
  await page.getByRole("button", { name: /切换经营时段/ }).click();
  await page.getByRole("button", { name: new RegExp(`^${time}`) }).click();
  await nav.getByRole("button", { name: "今日" }).click();
}

async function switchToRegional(page: Page) {
  const nav = page.getByRole("navigation", { name: "主要功能" });
  await nav.getByRole("button", { name: "我的" }).click();
  await page.getByRole("button", { name: /区域联动演示/ }).click();
  await page.getByRole("button", { name: /林阳 · 区域经理/ }).click();
  await expect(page.getByRole("heading", { name: "今天先帮助2家店" })).toBeVisible();
}

async function switchToManager(page: Page) {
  const nav = page.getByRole("navigation", { name: "主要功能" });
  await nav.getByRole("button", { name: "我的" }).click();
  await page.getByRole("button", { name: /回到黄店长/ }).click();
  await page.getByRole("button", { name: /黄店长.*看判断/ }).click();
  await expect(page.getByRole("heading", { name: /黄店长/ })).toBeVisible();
}

test.use({ viewport: { width: 393, height: 852 } });

test.beforeEach(async ({ page }) => {
  await resetDemo(page);
});

test("V4 opens at 08:30 with a conversational morning brief instead of a KPI dashboard", async ({ page }) => {
  await expect(page.getByTestId("device-screen")).toHaveAttribute("data-presentation", "direct");
  await expect(page.getByRole("heading", { name: "早上好，黄店长" })).toBeVisible();
  await expect(page.getByText("AI晨间简报")).toBeVisible();
  await expect(page.getByText(/昨天 ¥98,600，基本达标；今天预计 ¥92,000/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "真正要补的，是晚市约 65 位顾客" })).toBeVisible();
  await expect(page.getByText(/每桌消费正常，问题是晚市比正常少来 32 位顾客/)).toBeVisible();
  await expect(page.getByText(/约 25 桌；不行动预计少完成 ¥8,000/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "开个短晨会，把晚市目标讲清楚" })).toBeVisible();
  await expect(page.getByRole("button", { name: /查看今日经营剧本/ })).toBeVisible();
  await expect(page.getByText("当前完成", { exact: true })).toHaveCount(0);
  await expect(page.getByText("昨日复盘 + 今日预测")).toHaveCount(0);
  await expect(page.getByText(/六维|门店健康|经营健康/)).toHaveCount(0);
  expect(await page.evaluate(() => document.body.scrollWidth)).toBe(393);
});

test("guest and table conversion basis is explicit and labelled as demo data", async ({ page }) => {
  await page.getByRole("button", { name: /为什么这样计算/ }).click();
  await expect(page.getByRole("heading", { name: "换算与数据说明" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /¥8,000 为什么是25桌、65位顾客/ })).toBeVisible();
  await expect(page.getByText("按今日预计每桌约 ¥320、平均每桌约2.6位顾客换算")).toBeVisible();
  await expect(page.getByText("不代表真实门店经营结果")).toBeVisible();
});

test("the playbook starts the six-step morning meeting and returns generated actions to tasks", async ({ page }) => {
  await page.getByRole("button", { name: /查看今日经营剧本/ }).click();
  await expect(page.getByTestId("playbook-screen")).toBeVisible();
  await expect(page.getByRole("heading", { name: "今天补回25桌、65位顾客" })).toBeVisible();
  await page.getByRole("button", { name: /采用这份剧本，先开晨会/ }).click();

  await page.getByRole("button", { name: /开始语音晨会/ }).click();
  await waitForMock(page);
  await expect(page.getByText("正在记录 · 00:38")).toBeVisible();
  await page.getByRole("button", { name: /结束并让AI检查/ }).click();
  await waitForMock(page);
  await expect(page.getByText("晨会内容完整度")).toBeVisible();
  await expect(page.getByText("没有明确谁在20:30收集顾客反馈。")).toBeVisible();
  await page.getByRole("button", { name: /一句话采用AI补充/ }).click();
  await waitForMock(page);
  await expect(page.getByText("AI已生成5项行动")).toBeVisible();
  await page.getByRole("button", { name: /确认并下发5项行动/ }).click();
  await waitForMock(page);
  await page.getByRole("button", { name: /模拟员工接收回执/ }).click();
  await waitForMock(page);
  await expect(page.getByText("3位负责人全部确认")).toBeVisible();
  await page.getByRole("button", { name: /完成晨会闭环/ }).click();
  await waitForMock(page);
  await expect(page.getByRole("heading", { name: "晨会已经变成可执行的经营剧本" })).toBeVisible();
  await page.getByRole("button", { name: /继续下一项/ }).click();
  await expect(page.getByRole("heading", { name: "今天按这个节奏经营" })).toBeVisible();
  await expect(page.getByText("当前已完成 1/5 项")).toBeVisible();
});

test("lunch photo inspection resolves a concrete scene issue without a form", async ({ page }) => {
  await jumpToMoment(page, "12:00");
  await page.getByRole("button", { name: /拍一张午市现场/ }).click();
  await page.getByRole("button", { name: /模拟拍照并识别/ }).click();
  await waitForMock(page);
  await expect(page.getByText("现场基本正常，发现1处需处理")).toBeVisible();
  await expect(page.getByText("挡住动线")).toBeVisible();
  await page.getByRole("button", { name: /下发整改并模拟补拍/ }).click();
  await waitForMock(page);
  await expect(page.getByText("补拍后")).toBeVisible();
  await page.getByRole("button", { name: /完成巡检闭环/ }).click();
  await waitForMock(page);
  await expect(page.getByRole("heading", { name: "午市现场已处理" })).toBeVisible();
});

test("data translates business signals into guests tables orders and portions", async ({ page }) => {
  const nav = page.getByRole("navigation", { name: "主要功能" });
  await nav.getByRole("button", { name: "数据" }).click();
  await expect(page.getByRole("heading", { name: "今天经营答案" })).toBeVisible();
  await expect(page.getByText("每100位看过门店的顾客，比平时少成交3桌。")).toBeVisible();
  await expect(page.getByText("晚市预约比正常少11桌，预计少来29位顾客。")).toBeVisible();
  await expect(page.getByText("今天预计多浪费约 ¥320")).toBeVisible();
  await expect(page.getByText("3桌顾客提到等菜时间过长。")).toBeVisible();
  await page.getByRole("button", { name: /今天能不能完成目标/ }).click();
  await expect(page.getByTestId("insight-detail")).toBeVisible();
  await expect(page.getByText("收银POS + 预约 + 历史同星期")).toBeVisible();
  await expect(page.getByText("92%")).toBeVisible();
});

test("member recall and reservation follow-up improve forecast without changing current revenue", async ({ page }) => {
  await jumpToMoment(page, "17:30");
  await expect(page.getByText("当前完成")).toBeVisible();
  await expect(page.getByText("¥62,000", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /立即执行会员召回/ }).click();
  await page.getByRole("button", { name: /生成召回内容/ }).click();
  await waitForMock(page);
  await page.getByRole("button", { name: /确认并模拟发送/ }).click();
  await waitForMock(page);
  await page.getByRole("button", { name: /AI复查是否有效/ }).click();
  await waitForMock(page);
  await page.getByRole("button", { name: /确认结果并看下一步/ }).click();
  await waitForMock(page);
  await expect(page.getByRole("heading", { name: "已补回12桌、31位顾客" })).toBeVisible();
  await expect(page.getByText(/预计收官从 ¥92,000 提升到 ¥95,000/)).toBeVisible();
  await expect(page.getByText(/当前营业额仍是 ¥62,000/)).toBeVisible();
  await page.getByRole("button", { name: /继续下一项/ }).click();

  await page.getByRole("button", { name: /生成跟进清单/ }).click();
  await waitForMock(page);
  await page.getByRole("button", { name: /模拟跟进10桌/ }).click();
  await waitForMock(page);
  await page.getByRole("button", { name: /完成预约确认/ }).click();
  await waitForMock(page);
  await expect(page.getByRole("heading", { name: "累计补回19桌、49位顾客" })).toBeVisible();
  await page.getByRole("button", { name: /继续下一项/ }).click();
  await page.getByRole("button", { name: "返回" }).click();
  await expect(page.getByText("¥62,000", { exact: true })).toBeVisible();
  await expect(page.getByText("预计收官 ¥98,000")).toBeVisible();
  await expect(page.getByText("约 6 桌")).toBeVisible();
});

test("task page is a five-step operating script with sources methods evidence and impact", async ({ page }) => {
  const nav = page.getByRole("navigation", { name: "主要功能" });
  await nav.getByRole("button", { name: /任务/ }).click();
  await expect(page.getByText("《晚市顾客追回剧本》")).toBeVisible();
  await expect(page.getByText("晨会启动")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "08:45 · 召开3分钟晨会" })).toBeVisible();
  await expect(page.getByText("AI建议").first()).toBeVisible();
  await expect(page.getByText("晨会语音 + 员工接收回执")).toBeVisible();
  await expect(page.getByText("预计新增12桌、31位顾客")).toBeVisible();
});

test("academy uses current context and converts three concrete practices into the playbook", async ({ page }) => {
  const nav = page.getByRole("navigation", { name: "主要功能" });
  await nav.getByRole("button", { name: "学院" }).click();
  await expect(page.getByRole("heading", { name: "有问题，直接给做法" })).toBeVisible();
  await expect(page.getByText("已带入当前门店问题")).toBeVisible();
  await page.getByRole("button", { name: /评分下降怎么办/ }).click();
  await waitForMock(page);
  await expect(page.getByText("先解决3桌等菜问题，再回复评价。")).toBeVisible();
  await page.getByRole("button", { name: /加入今日经营剧本/ }).click();
  await expect(page.getByRole("button", { name: /已加入今日剧本/ })).toBeVisible();
  await page.getByRole("button", { name: /去看今天怎么做/ }).click();
  await expect(page.getByRole("heading", { name: "今天按这个节奏经营" })).toBeVisible();
});

test("manager growth has four evidence-based abilities and keeps regional role secondary", async ({ page }) => {
  const nav = page.getByRole("navigation", { name: "主要功能" });
  await nav.getByRole("button", { name: "我的" }).click();
  await expect(page.getByRole("heading", { name: "我正在变成更好的店长" })).toBeVisible();
  for (const label of ["营业管理", "顾客经营", "员工培养", "执行能力"]) {
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(page.getByText("区域联动演示")).toBeVisible();
  await expect(page.getByText(/六维|门店健康|经营健康/)).toHaveCount(0);
});

test("legacy procurement HR and sold-out modules are light actions under demo tools", async ({ page }) => {
  const nav = page.getByRole("navigation", { name: "主要功能" });
  await nav.getByRole("button", { name: "我的" }).click();
  await page.getByRole("button", { name: /其他店务动作/ }).click();
  await expect(page.getByRole("heading", { name: "其他店务动作" })).toBeVisible();
  await expect(page.getByRole("button", { name: /鸡肉预计不足2天/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /新人推荐动作待带教/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /嫩牛肉只剩6份/ })).toBeVisible();
  await page.getByRole("button", { name: /鸡肉预计不足2天/ }).click();
  await expect(page.getByRole("status")).toContainText("采购申请已生成");
});

test("regional role issues an action and manager returns evidence for approval", async ({ page }) => {
  test.setTimeout(45_000);
  await switchToRegional(page);
  await page.getByRole("button", { name: /三盛广场演示店.*预计还差/ }).click();
  await page.getByTestId("region-store-detail").getByRole("button", { name: "下发补充行动" }).click();
  await page.getByRole("button", { name: /开始并结束语音演示/ }).click();
  await page.getByRole("button", { name: /确认内容/ }).click();
  await page.getByRole("button", { name: /确认并下发/ }).click();
  await expect(page.getByRole("heading", { name: "行动已送达黄店长" })).toBeVisible();
  await page.getByRole("button", { name: /继续下一项/ }).click();
  await page.getByRole("button", { name: "返回" }).click();
  await switchToManager(page);

  const managerNav = page.getByRole("navigation", { name: "主要功能" });
  await managerNav.getByRole("button", { name: /任务/ }).click();
  await page.getByRole("button", { name: /查看区域行动/ }).click();
  await page.getByRole("button", { name: /接收行动/ }).click();
  await waitForMock(page);
  await page.getByRole("button", { name: /开始执行/ }).click();
  await waitForMock(page);
  await page.getByRole("button", { name: /模拟拍照并提交/ }).click();
  await waitForMock(page);
  await expect(page.getByText("证据已通过AI初验")).toBeVisible();
  await page.getByRole("button", { name: "返回" }).click();

  await managerNav.getByRole("button", { name: "我的" }).click();
  await page.getByRole("button", { name: /区域联动演示/ }).click();
  await page.getByRole("button", { name: /林阳 · 区域经理/ }).click();
  const regionNav = page.getByRole("navigation", { name: "主要功能" });
  await regionNav.getByRole("button", { name: /任务/ }).click();
  await page.getByRole("button", { name: /验收证据/ }).click();
  await page.getByRole("button", { name: /确认闭环/ }).click();
  await expect(page.getByRole("heading", { name: "区域已确认闭环" })).toBeVisible();
});

test("regional evidence can be returned for a specific replacement photo", async ({ page }) => {
  await page.evaluate((key) => window.localStorage.setItem(key, JSON.stringify({ role: "regional", moment: "dinner", regionalTaskStatus: "regional-review" })), STORAGE_KEY);
  await page.reload();
  const nav = page.getByRole("navigation", { name: "主要功能" });
  await nav.getByRole("button", { name: /任务/ }).click();
  await page.getByRole("button", { name: /验收证据/ }).click();
  await page.getByRole("button", { name: /退回补拍/ }).click();
  await switchToManager(page);
  const managerNav = page.getByRole("navigation", { name: "主要功能" });
  await managerNav.getByRole("button", { name: /任务/ }).click();
  await page.getByRole("button", { name: /查看区域行动/ }).click();
  await expect(page.getByText("区域经理要求补充证据")).toBeVisible();
});

test("manager help request and regional reply synchronize through reminders", async ({ page }) => {
  await page.evaluate((key) => window.localStorage.setItem(key, JSON.stringify({ regionalTaskStatus: "sent", moment: "dinner" })), STORAGE_KEY);
  await page.reload();
  const nav = page.getByRole("navigation", { name: "主要功能" });
  await nav.getByRole("button", { name: /任务/ }).click();
  await page.getByRole("button", { name: /查看区域行动/ }).click();
  await page.getByRole("button", { name: /我做不了，请求帮助/ }).click();
  await page.getByRole("button", { name: /一键发送求助/ }).click();
  await page.getByRole("button", { name: "返回" }).click();
  await nav.getByRole("button", { name: "我的" }).click();
  await page.getByRole("button", { name: /区域联动演示/ }).click();
  await page.getByRole("button", { name: /林阳 · 区域经理/ }).click();
  const regionNav = page.getByRole("navigation", { name: "主要功能" });
  await regionNav.getByRole("button", { name: /消息/ }).click();
  await page.getByRole("button", { name: /一键回复方案/ }).click();
  await switchToManager(page);
  await page.getByRole("button", { name: /查看提醒/ }).click();
  await expect(page.getByText("区域经理已回复求助")).toBeVisible();
});

test("closing review compares forecast with actual and creates tomorrow first action", async ({ page }) => {
  await jumpToMoment(page, "21:30");
  await page.getByRole("button", { name: /完成今日经营复盘/ }).click();
  await expect(page.getByTestId("closing-review").getByText("¥100,600")).toBeVisible();
  await page.getByRole("button", { name: /AI生成今日复盘/ }).click();
  await waitForMock(page);
  await expect(page.getByText("只保留3条")).toBeVisible();
  await page.getByRole("button", { name: /生成明日第一项行动/ }).click();
  await waitForMock(page);
  await expect(page.getByRole("heading", { name: "提前确认晚市预约名单" })).toBeVisible();
  await page.getByTestId("closing-review").getByRole("button", { name: "完成今日经营" }).click();
  await waitForMock(page);
  await expect(page.getByRole("heading", { name: "今天的经营已经收官" })).toBeVisible();
  await expect(page.getByText(/目标达成100.6%/)).toBeVisible();
});

test("V4 progress persists and reset restores the pre-open story without touching V3", async ({ page }) => {
  await jumpToMoment(page, "17:30");
  await page.reload();
  await expect(page.getByText("当前完成")).toBeVisible();
  const nav = page.getByRole("navigation", { name: "主要功能" });
  await nav.getByRole("button", { name: "我的" }).click();
  await page.getByRole("button", { name: /重置全部演示/ }).click();
  await page.getByRole("button", { name: /确认重置演示/ }).click();
  await expect(page.getByRole("heading", { name: "早上好，黄店长" })).toBeVisible();
  await expect(page.evaluate(() => window.localStorage.getItem("zhoumapo-manager-assistant-v3"))).resolves.toBeNull();
});

test("320 393 and 412 widths have no horizontal overflow", async ({ page }) => {
  for (const [width, height] of [[320, 720], [393, 852], [412, 915]] as const) {
    await page.setViewportSize({ width, height });
    await page.reload();
    expect(await page.evaluate(() => document.body.scrollWidth)).toBe(width);
    expect(await page.getByTestId("device-screen").evaluate((element) => Math.round(element.getBoundingClientRect().width))).toBe(width);
    expect(await page.locator(".app-shell").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  }
});
