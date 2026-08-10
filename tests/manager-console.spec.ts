import { expect, test, type Page } from "@playwright/test";

async function resetDemo(page: Page) {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.removeItem("zhoumapo-manager-assistant-v2"));
  await page.reload();
}

async function waitForMock(page: Page) {
  await page.waitForTimeout(700);
}

test.use({ viewport: { width: 393, height: 852 } });

test.beforeEach(async ({ page }) => {
  await resetDemo(page);
});

test("public route opens directly as the mobile workbench", async ({ page }) => {
  await expect(page.getByTestId("device-screen")).toHaveAttribute("data-presentation", "direct");
  await expect(page.getByTestId("phone-frame")).toHaveCount(0);
  await expect(page.getByTestId("device-picker")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "黄店长，今天按节奏赢下来" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "主要功能" })).toBeVisible();
  expect(await page.evaluate(() => document.body.scrollWidth)).toBe(393);
});

test("daily tasks clearly separate the three manager task sources", async ({ page }) => {
  await page.getByRole("button", { name: /必做任务 1\/4/ }).click();
  await expect(page.getByRole("heading", { name: "必做任务 · 3项" })).toBeVisible();

  await page.getByRole("button", { name: "领导下发", exact: true }).last().click();
  await expect(page.getByRole("heading", { name: "领导下发 · 2项" })).toBeVisible();

  await page.getByRole("button", { name: "自己领取", exact: true }).last().click();
  await expect(page.getByRole("heading", { name: "自己领取 · 2项" })).toBeVisible();
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

test("morning meeting closes the loop and routes to the next task", async ({ page }) => {
  await page.getByRole("button", { name: /开始执行/ }).click();
  await page.getByRole("button", { name: /开始语音晨会/ }).click();
  await waitForMock(page);
  await page.getByRole("button", { name: /AI拆成任务/ }).click();
  await waitForMock(page);
  await page.getByRole("button", { name: /确认并下发4项/ }).click();
  await waitForMock(page);
  await page.getByRole("button", { name: /模拟员工反馈/ }).click();
  await waitForMock(page);
  await page.getByRole("button", { name: /完成晨会闭环/ }).click();
  await waitForMock(page);

  await expect(page.getByText("去看4项任务的接收与进度")).toBeVisible();
  await page.getByRole("button", { name: "继续下一项" }).click();
  await expect(page.getByRole("heading", { name: "必做任务 · 3项" })).toBeVisible();
});

test("data signals and academy content connect information to action", async ({ page }) => {
  const nav = page.getByRole("navigation", { name: "主要功能" });
  await nav.getByRole("button", { name: /数据/ }).click();
  await expect(page.getByRole("heading", { name: "实时经营信号" })).toBeVisible();
  await expect(page.getByRole("button", { name: /美团评价 · 16:08/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /收银POS · 15:50/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /顾客反馈 · 14:26/ })).toBeVisible();

  await nav.getByRole("button", { name: "学院" }).click();
  await expect(page.getByRole("heading", { name: "黄老师经营课" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "创始人讲经营" })).toBeVisible();
  await page.getByRole("button", { name: /黄老师 · 今日推荐/ }).click();
  await expect(page.getByRole("button", { name: "一键转成行动任务" })).toBeVisible();
});

test("all core operation entries open and narrow phone widths do not overflow", async ({ page }) => {
  const checks = [
    { button: /采购下单/, heading: "智能采购下单" },
    { button: /菜品沽清/, heading: "菜品沽清与恢复" },
    { button: /人员考核/, heading: "人事考核与带教" },
  ];

  for (const check of checks) {
    await page.getByRole("button", { name: check.button }).first().click();
    await expect(page.getByRole("heading", { name: check.heading })).toBeVisible();
    await page.getByRole("button", { name: "返回" }).click();
    await page.waitForTimeout(250);
  }

  await page.getByRole("button", { name: /增加业绩/ }).click();
  await expect(page.getByRole("heading", { name: "增加业绩" })).toBeVisible();
  await page.getByRole("button", { name: "返回" }).click();

  for (const width of [320, 412]) {
    await page.setViewportSize({ width, height: width === 320 ? 720 : 915 });
    await page.reload();
    expect(await page.evaluate(() => document.body.scrollWidth)).toBe(width);
    expect(await page.getByTestId("device-screen").evaluate((element) => element.getBoundingClientRect().width)).toBe(width);
  }
});
