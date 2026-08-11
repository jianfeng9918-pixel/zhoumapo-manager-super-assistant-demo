import { expect, test, type Page } from "@playwright/test";

const STORAGE_KEY = "zhoumapo-manager-assistant-v3";

async function resetDemo(page: Page) {
  await page.goto("/");
  await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY);
  await page.reload();
}

async function waitForMock(page: Page) {
  await page.waitForTimeout(760);
}

async function switchToRegional(page: Page) {
  const roleButton = page.getByRole("button", { name: /演示角色为黄店长/ });
  if (await roleButton.count()) await roleButton.click();
  else {
    const nav = page.getByRole("navigation", { name: "主要功能" });
    await nav.getByRole("button", { name: "我的" }).click();
    await page.getByRole("button", { name: /切换演示角色.*林阳区域经理/ }).click();
  }
  await page.getByRole("button", { name: /林阳 · 区域经理.*6家门店/ }).click();
  await expect(page.getByRole("heading", { name: "区域经营总览" })).toBeVisible();
}

async function switchToManager(page: Page) {
  await page.getByRole("button", { name: /林阳.*区域经理/ }).first().click();
  await page.getByRole("button", { name: /黄店长.*三盛广场演示店/ }).click();
  await expect(page.getByRole("heading", { name: /黄店长，/ })).toBeVisible();
}

async function jumpToPhase(page: Page, time: string) {
  const nav = page.getByRole("navigation", { name: "主要功能" });
  await nav.getByRole("button", { name: "我的" }).click();
  await page.getByRole("button", { name: /演示经营时段/ }).click();
  await page.getByRole("button", { name: new RegExp(`^${time}`) }).click();
  await nav.getByRole("button", { name: "今日" }).click();
}

test.use({ viewport: { width: 393, height: 852 } });

test.beforeEach(async ({ page }) => {
  await resetDemo(page);
});

test("public route starts at 08:50 as the manager mobile workbench", async ({ page }) => {
  await expect(page.getByTestId("device-screen")).toHaveAttribute("data-presentation", "direct");
  await expect(page.getByTestId("phone-frame")).toHaveCount(0);
  await expect(page.getByTestId("device-picker")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "黄店长，早上好" })).toBeVisible();
  const kpi = page.getByRole("button", { name: "查看今日经营数据" });
  await expect(kpi).toContainText("当前完成 · 08:50");
  await expect(kpi).toContainText("¥8,600");
  await expect(kpi).toContainText("离目标还差¥91,400");
  await expect(kpi).toContainText("预计收官¥92,000");
  await expect(kpi).toContainText("预测缺口¥8,000");
  await expect(kpi).toContainText("门店健康73");
  await expect(page.getByRole("heading", { name: "开晨会，把今天讲清楚" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "主要功能" })).toBeVisible();
  expect(await page.evaluate(() => document.body.scrollWidth)).toBe(393);
});

test("task map separates required, headquarters, regional, AI and self-claimed sources", async ({ page }) => {
  await page.getByRole("button", { name: /必做任务 0\/5/ }).click();
  await expect(page.getByRole("heading", { name: "必做任务 · 4项" })).toBeVisible();

  await page.getByRole("button", { name: "总部任务", exact: true }).last().click();
  await expect(page.getByRole("heading", { name: "总部任务 · 1项" })).toBeVisible();

  await page.getByRole("button", { name: "区域任务", exact: true }).last().click();
  await expect(page.getByRole("heading", { name: "区域任务 · 0项" })).toBeVisible();

  await page.getByRole("button", { name: "AI推荐", exact: true }).last().click();
  await expect(page.getByRole("heading", { name: "AI推荐 · 1项" })).toBeVisible();

  await page.getByRole("button", { name: "自主领取", exact: true }).last().click();
  await expect(page.getByRole("heading", { name: "自主领取 · 1项" })).toBeVisible();
});

test("voice instruction becomes a distributed task with receipts", async ({ page }) => {
  await page.getByRole("button", { name: /一句话安排店务/ }).click();
  await page.getByRole("button", { name: /点击开始语音演示/ }).click();
  await expect(page.getByText("正在听 · 00:08")).toBeVisible();
  await page.getByRole("button", { name: /结束录音并让AI整理/ }).click();
  await expect(page.getByText("AI已补充")).toBeVisible();
  await page.getByRole("button", { name: /确认并分发/ }).click();
  await expect(page.getByRole("heading", { name: "前厅4人全部接收" })).toBeVisible();
  await page.getByRole("button", { name: "查看我下发的任务" }).click();
  await page.waitForTimeout(650);
  await expect(page.getByRole("heading", { name: "我下发 · 1项" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "新品推荐训练" })).toBeVisible();
});

test("enhanced morning meeting finds a missing topic and closes the six-step loop", async ({ page }) => {
  await page.getByRole("button", { name: /开始执行/ }).click();
  await page.getByRole("button", { name: /开始语音晨会/ }).click();
  await waitForMock(page);
  await expect(page.getByText("AI实时提取")).toBeVisible();
  await page.getByRole("button", { name: /结束并检查晨会/ }).click();
  await waitForMock(page);
  await expect(page.getByText("晨会完整度")).toBeVisible();
  await expect(page.getByText("差评复盘")).toBeVisible();
  await page.getByRole("button", { name: /一句话采用AI补充/ }).click();
  await waitForMock(page);
  await expect(page.getByText("已检查当班与时间冲突")).toBeVisible();
  await page.getByRole("button", { name: /确认并下发4项/ }).click();
  await waitForMock(page);
  await page.getByRole("button", { name: /模拟员工反馈/ }).click();
  await waitForMock(page);
  await expect(page.getByText("4项任务全部确认")).toBeVisible();
  await page.getByRole("button", { name: /完成晨会闭环/ }).click();
  await waitForMock(page);
  await expect(page.getByRole("heading", { name: "晨会闭环完成" })).toBeVisible();
  await page.getByRole("button", { name: "继续下一项" }).click();
  await expect(page.getByRole("heading", { name: "必做任务 · 4项" })).toBeVisible();
});

test("health diagnosis leads to an action and updates forecast and health", async ({ page }) => {
  await jumpToPhase(page, "16:20");
  const nav = page.getByRole("navigation", { name: "主要功能" });
  await nav.getByRole("button", { name: /数据/ }).click();
  await page.getByRole("button", { name: /客单 58.*异常.*-9.4%/ }).click();
  await expect(page.getByText("判断可信度 92%")).toBeVisible();
  await expect(page.getByText("收银POS + 菜品明细 + 员工推荐记录")).toBeVisible();
  await page.getByRole("button", { name: /立即领取任务/ }).click();
  await page.getByRole("button", { name: /团队行动/ }).click();
  await page.getByRole("button", { name: /领取这项行动/ }).click();
  await waitForMock(page);
  await page.getByRole("button", { name: /模拟拍照并回传/ }).click();
  await waitForMock(page);
  await page.getByRole("button", { name: /AI验收并看结果/ }).click();
  await waitForMock(page);
  await page.getByRole("button", { name: "继续下一项" }).click();
  await expect(page.getByText("预计收官 ¥98,000")).toBeVisible();
  await expect(page.getByRole("button", { name: /客单 70.*关注.*\+7.2%/ })).toBeVisible();
});

test("AI diagnosis and dinner protection advance the remaining day phases", async ({ page }) => {
  await page.evaluate((key) => window.localStorage.setItem(key, JSON.stringify({ dayPhase: "afternoon" })), STORAGE_KEY);
  await page.reload();
  const nav = page.getByRole("navigation", { name: "主要功能" });
  await nav.getByRole("button", { name: /数据/ }).click();
  await page.getByRole("button", { name: /客单 58/ }).click();
  await page.getByRole("button", { name: /立即领取任务/ }).click();
  await expect.poll(async () => page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? "{}").dayPhase, STORAGE_KEY)).toBe("preDinner");

  await page.evaluate((key) => window.localStorage.setItem(key, JSON.stringify({ dayPhase: "dinner", soldoutStage: 3 })), STORAGE_KEY);
  await page.reload();
  await page.getByRole("button", { name: /开始执行/ }).click();
  await page.getByRole("button", { name: /一键恢复上架/ }).click();
  await expect.poll(async () => page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? "{}").dayPhase, STORAGE_KEY)).toBe("closing");
  await expect(page.getByRole("heading", { name: "沽清与恢复已闭环" })).toBeVisible();
});

test("photo inspection creates a correction, accepts the retake and advances the day", async ({ page }) => {
  await jumpToPhase(page, "11:30");
  await page.getByRole("button", { name: /开始执行/ }).click();
  await page.getByRole("button", { name: /模拟拍照并识别/ }).click();
  await waitForMock(page);
  await expect(page.getByText("环境整洁度92分")).toBeVisible();
  await page.getByRole("button", { name: /下发整改并模拟完成/ }).click();
  await waitForMock(page);
  await expect(page.getByText("补拍后")).toBeVisible();
  await page.getByRole("button", { name: /完成巡检闭环/ }).click();
  await waitForMock(page);
  await expect(page.getByRole("heading", { name: "午市巡检完成" })).toBeVisible();
  await page.getByRole("button", { name: "继续下一项" }).click();
  await expect(page.getByText("14:30更新")).toBeVisible();
});

test("active reminders open the right action and reduce the unread count", async ({ page }) => {
  await page.getByRole("button", { name: /查看提醒，2条未处理/ }).click();
  await expect(page.getByRole("heading", { name: "2件事需要处理" })).toBeVisible();
  await page.getByRole("button", { name: /昨日3条差评待复盘/ }).click();
  await expect(page.getByRole("heading", { name: "近7日新增3条差评" })).toBeVisible();
  await page.getByRole("button", { name: "返回", exact: true }).click();
  await expect(page.getByRole("heading", { name: "1件事需要处理" })).toBeVisible();
});

test("regional manager issues a task, manager returns proof and regional manager approves", async ({ page }) => {
  test.setTimeout(45_000);
  await switchToRegional(page);
  await page.getByRole("button", { name: /预计缺口.*首要问题/ }).click();
  await page.getByRole("button", { name: /语音下发任务/ }).click();
  await page.getByRole("button", { name: /开始语音演示/ }).click();
  await page.getByRole("button", { name: /结束并让AI整理/ }).click();
  await page.getByRole("button", { name: /确认并下发/ }).click();
  await expect(page.getByRole("heading", { name: "任务已送达黄店长" })).toBeVisible();
  await page.getByRole("button", { name: /查看区域任务状态/ }).click();
  await page.getByRole("button", { name: "返回" }).click();
  await switchToManager(page);

  await page.getByRole("button", { name: /区域任务 1项/ }).click();
  await page.getByRole("button", { name: /区域任务.*待接收.*晚市主动推荐训练/ }).click();
  await page.getByRole("button", { name: /接收任务/ }).click();
  await waitForMock(page);
  await page.getByRole("button", { name: /开始执行训练/ }).click();
  await waitForMock(page);
  await page.getByRole("button", { name: /模拟拍照并提交/ }).click();
  await waitForMock(page);
  await expect(page.getByRole("heading", { name: "等待林阳验收" })).toBeVisible();
  await page.getByRole("button", { name: "返回" }).click();

  const nav = page.getByRole("navigation", { name: "主要功能" });
  await nav.getByRole("button", { name: "我的" }).click();
  await page.getByRole("button", { name: /切换演示角色.*林阳区域经理/ }).click();
  await page.getByRole("button", { name: /林阳 · 区域经理.*6家门店/ }).click();
  const regionalNav = page.getByRole("navigation", { name: "主要功能" });
  await regionalNav.getByRole("button", { name: /任务/ }).click();
  await page.getByRole("button", { name: /区域任务.*待区域验收.*晚市主动推荐训练/ }).click();
  await page.getByRole("button", { name: /确认闭环/ }).click();
  await expect(page.getByRole("heading", { name: "区域已确认闭环" })).toBeVisible();
  await page.getByRole("button", { name: "返回", exact: true }).click();
  await switchToManager(page);
  const updatedKpi = page.getByRole("button", { name: "查看今日经营数据" });
  await expect(updatedKpi).toContainText("预计收官¥98,000");
  await expect(updatedKpi).toContainText("门店健康76");
});

test("regional evidence can be rejected and returns to the manager as a correction", async ({ page }) => {
  await page.evaluate((key) => window.localStorage.setItem(key, JSON.stringify({ role: "regional", dayPhase: "preDinner", regionalTaskStatus: "regional-review" })), STORAGE_KEY);
  await page.reload();
  const nav = page.getByRole("navigation", { name: "主要功能" });
  await nav.getByRole("button", { name: /任务/ }).click();
  await page.getByRole("button", { name: /待区域验收.*晚市主动推荐训练/ }).click();
  await page.getByRole("button", { name: /退回补拍/ }).click();
  await page.getByRole("button", { name: "返回" }).click();
  await switchToManager(page);
  await page.getByRole("button", { name: /区域任务 1项/ }).click();
  await expect(page.getByRole("button", { name: /区域任务.*需整改.*晚市主动推荐训练/ })).toBeVisible();
  await page.getByRole("button", { name: /区域任务.*需整改.*晚市主动推荐训练/ }).click();
  await expect(page.getByText("区域经理要求补拍")).toBeVisible();
});

test("manager asks for help and regional reply returns as an active reminder", async ({ page }) => {
  const nav = page.getByRole("navigation", { name: "主要功能" });
  await nav.getByRole("button", { name: /数据/ }).click();
  await page.getByRole("button", { name: /客单 58/ }).click();
  await page.getByRole("button", { name: /请区域经理帮助判断/ }).click();
  await page.getByRole("button", { name: /一键发送求助/ }).click();
  await page.getByRole("button", { name: "返回" }).click();
  await nav.getByRole("button", { name: "我的" }).click();
  await page.getByRole("button", { name: /切换演示角色.*林阳区域经理/ }).click();
  await page.getByRole("button", { name: /林阳 · 区域经理.*6家门店/ }).click();
  const regionalNav = page.getByRole("navigation", { name: "主要功能" });
  await regionalNav.getByRole("button", { name: /消息/ }).click();
  await expect(page.getByRole("heading", { name: "客单价提升行动需要帮助" })).toBeVisible();
  await page.getByRole("button", { name: /一键回复并安排支持/ }).click();
  await switchToManager(page);
  await page.getByRole("button", { name: /查看提醒/ }).click();
  await expect(page.getByText("区域经理已回复求助")).toBeVisible();
});

test("closing review compares result, creates tomorrow task and generates the report", async ({ page }) => {
  await jumpToPhase(page, "21:30");
  await page.getByRole("button", { name: /开始执行/ }).click();
  const review = page.getByTestId("closing-review");
  await expect(review.getByText("实际收官")).toBeVisible();
  await expect(review.getByText("¥100,600")).toBeVisible();
  await page.getByRole("button", { name: /AI生成今日复盘/ }).click();
  await waitForMock(page);
  await expect(page.getByText("只保留3条")).toBeVisible();
  await page.getByRole("button", { name: /转为明日任务/ }).click();
  await page.getByRole("button", { name: /生成日报与明日任务/ }).click();
  await waitForMock(page);
  await expect(page.getByText("8月11日经营日报")).toBeVisible();
  await page.getByRole("button", { name: /完成今日经营/ }).click();
  await waitForMock(page);
  await expect(page.getByRole("heading", { name: "今日经营已收官" })).toBeVisible();
  await expect(page.getByText(/目标达成100.6%/)).toBeVisible();
});

test("V3 state persists after refresh and reset returns to the 08:50 opening scene", async ({ page }) => {
  await jumpToPhase(page, "21:30");
  await page.reload();
  const closingKpi = page.getByRole("button", { name: "查看今日经营数据" });
  await expect(closingKpi).toContainText("当前完成 · 21:30");
  await expect(closingKpi).toContainText("¥100,600");
  const nav = page.getByRole("navigation", { name: "主要功能" });
  await nav.getByRole("button", { name: "我的" }).click();
  await page.getByRole("button", { name: /重置全部演示/ }).click();
  await page.getByRole("button", { name: /确认重置演示/ }).click();
  const openingKpi = page.getByRole("button", { name: "查看今日经营数据" });
  await expect(openingKpi).toContainText("当前完成 · 08:50");
  await expect(openingKpi).toContainText("¥8,600");
});

test("data, academy and every core operation stay connected to action", async ({ page }) => {
  const nav = page.getByRole("navigation", { name: "主要功能" });
  await nav.getByRole("button", { name: /数据/ }).click();
  await expect(page.getByRole("heading", { name: "实时经营信号" })).toBeVisible();
  await nav.getByRole("button", { name: "学院" }).click();
  await expect(page.getByRole("heading", { name: "黄老师经营课" })).toBeVisible();
  await page.getByRole("button", { name: /黄老师 · 今日推荐/ }).click();
  await expect(page.getByRole("button", { name: "一键转成行动任务" })).toBeVisible();
  await page.getByRole("button", { name: "返回" }).click();
  await nav.getByRole("button", { name: "今日" }).click();

  const checks = [
    { button: /采购下单/, heading: "智能采购下单" },
    { button: /菜品沽清/, heading: "菜品沽清与恢复" },
    { button: /人员考核/, heading: "人事考核与带教" },
    { button: /拍照巡检/, heading: "拍一张，AI替你检查" },
  ];
  for (const check of checks) {
    await page.getByRole("button", { name: check.button }).first().click();
    await expect(page.getByRole("heading", { name: check.heading })).toBeVisible();
    await page.getByRole("button", { name: "返回" }).click();
  }
});

test("320, 393 and 412 widths have no horizontal overflow", async ({ page }) => {
  for (const [width, height] of [[320, 720], [393, 852], [412, 915]] as const) {
    await page.setViewportSize({ width, height });
    await page.reload();
    expect(await page.evaluate(() => document.body.scrollWidth)).toBe(width);
    expect(await page.getByTestId("device-screen").evaluate((element) => element.getBoundingClientRect().width)).toBe(width);
    const shellWidth = await page.locator(".app-shell").evaluate((element) => element.getBoundingClientRect().width);
    expect(shellWidth).toBeLessThanOrEqual(width);
  }
});
