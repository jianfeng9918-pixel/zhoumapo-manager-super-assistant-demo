import { expect, test, type Page } from "@playwright/test";

const storageKey = "zhoumapo-manager-assistant-final-v2";

async function openDemo(page: Page, width = 393, height = 852) {
  await page.setViewportSize({ width, height });
  await page.goto("/");
  await page.evaluate((key) => window.localStorage.removeItem(key), storageKey);
  await page.reload();
  await expect(page.getByRole("heading", { name: "黄店长，早上好" })).toBeVisible();
}

async function waitForBusy(page: Page) {
  const busy = page.getByRole("status").filter({ hasText: /正在|AI/ });
  if (await busy.count()) await busy.first().waitFor({ state: "hidden", timeout: 5000 }).catch(() => undefined);
}

async function completeMeeting(page: Page) {
  await page.getByRole("button", { name: "开始晨会", exact: true }).click();
  await page.getByRole("button", { name: "开始语音晨会" }).click();
  await expect(page.getByText("正在记录 · 01:36")).toBeVisible();
  await page.getByRole("button", { name: "结束并让AI整理" }).click();
  await waitForBusy(page);
  await expect(page.getByText("发现1个漏项")).toBeVisible();
  await page.getByRole("button", { name: "一句话补充漏项" }).click();
  await expect(page.getByText("漏项已补充")).toBeVisible();
  await page.getByRole("button", { name: "人工确认并下发3项行动" }).click();
  await waitForBusy(page);
  await expect(page.getByRole("heading", { name: "每一步都从经营问题出发" })).toBeVisible();
}

async function backToRoot(page: Page) {
  const back = page.getByRole("button", { name: "返回" }).filter({ visible: true });
  while (await back.count()) {
    await back.first().click();
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(450);
}

async function switchRole(page: Page, roleName: string) {
  await backToRoot(page);
  const mine = page.getByRole("button", { name: "我的", exact: true });
  await mine.click();
  const roleEntry = page.getByRole("button", { name: /区域与总部联动演示|切换演示角色/ }).first();
  await roleEntry.click();
  await page.getByRole("button", { name: new RegExp(roleName) }).click();
  await page.waitForTimeout(250);
}

async function clickCurrentFlowButton(page: Page, name: string | RegExp) {
  const button = page
    .locator('.flow-screen[data-flow-current="true"]')
    .getByRole("button", { name })
    .filter({ visible: true })
    .last();
  await expect(button).toBeVisible();
  await button.click();
  await page.waitForTimeout(350);
}

async function submitSupportRequest(page: Page) {
  await backToRoot(page);
  await page.getByRole("navigation", { name: "底部导航" }).getByRole("button", { name: /任务/ }).click();
  await page.locator("main.store-page .playbook-progress").getByRole("button", { name: /16:20.*向180位会员发送召回内容/ }).click();
  await clickCurrentFlowButton(page, /门店资源不够/);
  await clickCurrentFlowButton(page, "人工确认并发送申请");
  await waitForBusy(page);
  await expect(page.getByRole("heading", { name: "林阳已收到申请" })).toBeVisible();
}

async function completeRecallToRegionalReview(page: Page) {
  await backToRoot(page);
  await page.getByRole("navigation", { name: "底部导航" }).getByRole("button", { name: /任务/ }).click();
  await page.locator("main.store-page .playbook-progress").getByRole("button", { name: /16:20.*向180位会员发送召回内容/ }).click();
  await clickCurrentFlowButton(page, "人工确认执行");
  await clickCurrentFlowButton(page, "确认发送给180位会员");
  await waitForBusy(page);
  await clickCurrentFlowButton(page, "回传系统结果");
  await waitForBusy(page);
  await clickCurrentFlowButton(page, "开始AI初验");
  await waitForBusy(page);
  await expect(page.getByRole("button", { name: "等待林阳人工验收" })).toBeVisible();
}

async function completeReservationToRegionalReview(page: Page) {
  await backToRoot(page);
  await page.getByRole("navigation", { name: "底部导航" }).getByRole("button", { name: /任务/ }).click();
  await page.locator("main.store-page .playbook-progress").getByRole("button", { name: /16:40.*跟进10桌未确认预约/ }).click();
  await clickCurrentFlowButton(page, "人工确认执行");
  await clickCurrentFlowButton(page, "确认已跟进10桌");
  await waitForBusy(page);
  await clickCurrentFlowButton(page, "回传系统结果");
  await waitForBusy(page);
  await clickCurrentFlowButton(page, "开始AI初验");
  await waitForBusy(page);
  await expect(page.getByRole("button", { name: "等待林阳人工验收" })).toBeVisible();
}

async function completeExperienceToRegionalReview(page: Page) {
  await backToRoot(page);
  await page.getByRole("navigation", { name: "底部导航" }).getByRole("button", { name: /任务/ }).click();
  await page.locator("main.store-page .playbook-progress").getByRole("button", { name: /18:00.*店长关注10桌顾客体验/ }).click();
  await clickCurrentFlowButton(page, "人工确认执行");
  await clickCurrentFlowButton(page, "确认完成并准备回传");
  await waitForBusy(page);
  await clickCurrentFlowButton(page, "拍照并回传");
  await waitForBusy(page);
  await clickCurrentFlowButton(page, "开始AI初验");
  await waitForBusy(page);
  await expect(page.getByRole("button", { name: "等待林阳人工验收" })).toBeVisible();
}

async function approveRegionalAction(page: Page, actionName: RegExp) {
  await backToRoot(page);
  await page.getByRole("navigation", { name: "底部导航" }).getByRole("button", { name: /任务/ }).click();
  await page.locator("main.region-page").getByRole("button", { name: actionName }).click();
  await clickCurrentFlowButton(page, "确认这项闭环");
}

test("终局版首屏在393×852内同时出现判断、唯一主行动和五栏导航", async ({ page }) => {
  await openDemo(page);
  await expect(page.getByRole("heading", { name: "今天重点不是继续提客单，而是补回晚市顾客。" })).toBeVisible();
  await expect(page.getByRole("button", { name: "开始晨会", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "今天经营路线" }).getByRole("button", { name: /12:00.*午市复查/ })).toBeVisible();
  await expect(page.locator(".v6-evidence-strip > span")).toHaveCount(3);
  for (const label of ["今日", "数据", "任务", "学院", "我的"]) {
    await expect(page.getByRole("button", { name: new RegExp(label) }).last()).toBeVisible();
  }
  const primaryBox = await page.getByRole("button", { name: "开始晨会", exact: true }).boundingBox();
  const navBox = await page.getByRole("navigation", { name: "底部导航" }).boundingBox();
  expect(primaryBox?.y).toBeLessThan(navBox?.y ?? 0);
});

test("V6首屏采用经营语义色并只出现一个实心红色主按钮", async ({ page }) => {
  await openDemo(page);
  const visual = await page.evaluate(() => {
    const primary = [...document.querySelectorAll<HTMLElement>("button")].filter((item) => {
      const style = getComputedStyle(item);
      return style.backgroundColor === "rgb(216, 51, 40)" && item.getBoundingClientRect().height > 0;
    });
    return {
      redButtons: primary.length,
      ai: getComputedStyle(document.querySelector<HTMLElement>(".ai-command-card")!).borderColor,
      routeColors: [...document.querySelectorAll<HTMLElement>(".semantic-day-route button > span")].map((item) => getComputedStyle(item).color),
    };
  });
  expect(visual.redButtons).toBe(1);
  expect(visual.ai).toBe("rgb(215, 213, 255)");
  expect(new Set(visual.routeColors).size).toBe(3);
});

test("午市拍一张照片后自动推进到14:30且生成现场判断", async ({ page }) => {
  await openDemo(page);
  await page.getByRole("button", { name: "我的", exact: true }).click();
  await page.getByRole("button", { name: "12:00" }).click();
  await page.getByRole("button", { name: "今日", exact: true }).click();
  await expect(page.getByRole("button", { name: "拍照复查" })).toBeVisible();
  await page.getByRole("button", { name: "拍照复查" }).click();
  await page.getByRole("button", { name: /模拟拍照并让AI识别/ }).click();
  await waitForBusy(page);
  await expect(page.getByText("传菜口等待偏久", { exact: true })).toBeVisible();
  let state = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)!), storageKey);
  expect(state.operatingStage).toBe("afternoonDecision");
  expect(state.evidence.some((item: { actionId: string }) => item.actionId === "lunch-inspection")).toBe(true);
});

test("14:30确认剧本后自动进入17:30晚市追回", async ({ page }) => {
  await openDemo(page);
  await page.getByRole("button", { name: "我的", exact: true }).click();
  await page.getByRole("button", { name: "14:30" }).click();
  await page.getByRole("button", { name: "今日", exact: true }).click();
  await page.getByRole("button", { name: "确认剧本" }).click();
  await page.getByRole("button", { name: "人工确认晚市经营剧本" }).click();
  await backToRoot(page);
  const state = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)!), storageKey);
  expect(state.operatingStage).toBe("dinnerRecovery");
  expect(state.brief.currentRevenue).toBe(62000);
  expect(state.brief.expectedRevenueNow).toBe(70000);
});

test("店长日常主线不出现健康值、六维评分、订货或排班入口", async ({ page }) => {
  await openDemo(page);
  const body = await page.locator("body").innerText();
  expect(body).not.toContain("健康值");
  expect(body).not.toContain("六维");
  expect(body).not.toContain("订货");
  expect(body).not.toContain("排班");
  expect(body).not.toContain("综合评分");
});

test("晨会在人工确认前只预生成，确认后才正式释放行动", async ({ page }) => {
  await openDemo(page);
  await page.getByRole("button", { name: "开始晨会", exact: true }).click();
  await page.getByRole("button", { name: "开始语音晨会" }).click();
  await page.getByRole("button", { name: "结束并让AI整理" }).click();
  await waitForBusy(page);
  await expect(page.getByText("AI预生成3项行动")).toBeVisible();
  await expect(page.getByText("尚未下发")).toBeVisible();
  let state = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)!), storageKey);
  expect(state.actions.find((item: { id: string }) => item.id === "member-recall").released).toBe(false);
  await page.getByRole("button", { name: "一句话补充漏项" }).click();
  await page.getByRole("button", { name: "人工确认并下发3项行动" }).click();
  await waitForBusy(page);
  state = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)!), storageKey);
  expect(state.actions.find((item: { id: string }) => item.id === "member-recall").released).toBe(true);
  expect(state.approvals.some((item: { entityId: string }) => item.entityId === "decision-dinner-gap")).toBe(true);
});

test("晨会闭环包含转写、漏项、负责人、接收回执与行动页", async ({ page }) => {
  await openDemo(page);
  await completeMeeting(page);
  await expect(page.getByText("王小丽 · AI建议")).toBeVisible();
  await expect(page.getByText("李主管 · AI建议")).toBeVisible();
  await backToRoot(page);
  await expect(page.getByText("3位负责人已接收晨会行动")).toHaveCount(0);
  await page.getByRole("button", { name: "查看提醒" }).click();
  await expect(page.getByText("3位负责人已接收晨会行动")).toBeVisible();
});

test("数据页用顾客和桌数回答问题，原始口径折叠在判断详情", async ({ page }) => {
  await openDemo(page);
  await page.getByRole("button", { name: "数据", exact: true }).click();
  await expect(page.getByText(/预计还差25桌、65位顾客/)).toBeVisible();
  await page.getByRole("button", { name: /今天能不能达标/ }).click();
  await expect(page.getByRole("heading", { name: "晚市预计少65位顾客，约25桌。" })).toBeVisible();
  await expect(page.getByText("按预计人均 ¥123、每桌2.6位顾客模拟换算")).toBeVisible();
  await expect(page.getByText("置信度92%")).toBeVisible();
});

test("经营行动展示来源、责任人、证据、模板版本与复查时间", async ({ page }) => {
  await openDemo(page);
  await completeMeeting(page);
  await page.getByRole("button", { name: /16:20.*向180位会员发送召回内容/ }).click();
  await expect(page.getByText("AI建议").first()).toBeVisible();
  await expect(page.getByText("王小丽 · 截止16:35")).toBeVisible();
  await expect(page.getByText("触达人数回执")).toBeVisible();
  await expect(page.getByText(/使用策略模板 v3.0/)).toBeVisible();
  await expect(page.getByText(/17:00复查/)).toBeVisible();
});

test("店长支持申请只有人工确认后才进入区域消息", async ({ page }) => {
  await openDemo(page);
  await submitSupportRequest(page);
  const state = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)!), storageKey);
  expect(state.workRequests[0].status).toBe("pendingRegional");
  expect(state.workRequests[0].approvalRecordIds.length).toBe(1);
  expect(state.notifications.some((item: { role: string; entityId: string }) => item.role === "regionalManager" && item.entityId === "request-market-support")).toBe(true);
});

test("店长执行回传后AI只初验，仍等待区域人工验收", async ({ page }) => {
  await openDemo(page);
  await completeMeeting(page);
  await completeRecallToRegionalReview(page);
  const state = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)!), storageKey);
  expect(state.actions.find((item: { id: string }) => item.id === "member-recall").status).toBe("pendingHumanReview");
  expect(state.evidence[0].aiResult).toBe("passed");
  expect(state.approvals.some((item: { entityType: string }) => item.entityType === "evidence")).toBe(false);
});

test("召回与预约分别验收后才把顾客缺口从65人降到16人", async ({ page }) => {
  test.setTimeout(60_000);
  await openDemo(page);
  await completeMeeting(page);
  await completeRecallToRegionalReview(page);
  await switchRole(page, "林阳区域经理");
  await approveRegionalAction(page, /向180位会员发送召回内容/);
  await switchRole(page, "黄店长");
  await page.getByRole("button", { name: "今日", exact: true }).click();
  await expect(page.getByRole("button", { name: "继续预约跟进" })).toBeVisible();
  let state = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)!), storageKey);
  expect(state.gapProgress.recoveredGuests).toBe(31);
  expect(state.gapProgress.remainingGuests).toBe(34);
  expect(state.brief.forecastRevenue).toBe(95800);

  await completeReservationToRegionalReview(page);
  await switchRole(page, "林阳区域经理");
  await approveRegionalAction(page, /跟进10桌未确认预约/);
  state = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)!), storageKey);
  expect(state.gapProgress.recoveredGuests).toBe(49);
  expect(state.gapProgress.recoveredTables).toBe(19);
  expect(state.gapProgress.remainingGuests).toBe(16);
  expect(state.gapProgress.remainingTables).toBe(6);
  expect(state.brief.currentRevenue).toBe(62000);
  expect(state.brief.forecastRevenue).toBe(98000);
});

test("区域回复支持、人工验收后与店长预测同步且当前营业额不虚增", async ({ page }) => {
  test.setTimeout(45_000);
  await openDemo(page);
  await completeMeeting(page);
  await submitSupportRequest(page);
  await completeRecallToRegionalReview(page);
  await completeReservationToRegionalReview(page);
  await switchRole(page, "林阳区域经理");
  await page.getByRole("button", { name: /现在处理/ }).click();
  await page.getByRole("button", { name: /区域直接支持/ }).click();
  await waitForBusy(page);
  await approveRegionalAction(page, /向180位会员发送召回内容/);
  await approveRegionalAction(page, /跟进10桌未确认预约/);
  await switchRole(page, "黄店长");
  await page.getByRole("button", { name: "今日", exact: true }).click();
  await expect(page.getByRole("heading", { name: "召回与预约跟进已闭环" })).toBeVisible();
  await expect(page.getByText(/预计收官由 ¥92,000 提升至 ¥98,000/)).toBeVisible();
  const state = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)!), storageKey);
  expect(state.brief.currentRevenue).toBe(62000);
  expect(state.brief.forecastRevenue).toBe(98000);
  expect(state.gapProgress.remainingGuests).toBe(16);
  expect(state.gapProgress.remainingTables).toBe(6);
});

test("区域支持未处理时不得显示剩余16位顾客已追回", async ({ page }) => {
  test.setTimeout(45_000);
  await openDemo(page);
  await completeMeeting(page);
  await submitSupportRequest(page);
  await completeRecallToRegionalReview(page);
  await completeReservationToRegionalReview(page);
  await switchRole(page, "林阳区域经理");
  await approveRegionalAction(page, /向180位会员发送召回内容/);
  await approveRegionalAction(page, /跟进10桌未确认预约/);
  await switchRole(page, "黄店长");
  await page.getByRole("button", { name: "我的", exact: true }).click();
  await page.getByRole("button", { name: "21:30" }).click();
  const state = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)!), storageKey);
  expect(state.workRequests[0].status).toBe("pendingRegional");
  expect(state.dailyReview.actualRevenue).toBe(94100);
  expect(state.dailyReview.outcome).toBe("partial");
});

test("区域可退回具体证据，店长同步收到补充要求", async ({ page }) => {
  await openDemo(page);
  await completeMeeting(page);
  await completeRecallToRegionalReview(page);
  await switchRole(page, "林阳区域经理");
  await backToRoot(page);
  await page.getByRole("navigation", { name: "底部导航" }).getByRole("button", { name: /任务/ }).click();
  await page.locator("main.region-page").getByRole("button", { name: /向180位会员发送召回内容/ }).click();
  await page.getByRole("button", { name: "退回补充" }).click();
  await switchRole(page, "黄店长");
  await page.getByRole("button", { name: "今日", exact: true }).click();
  await page.getByRole("button", { name: "查看提醒" }).click();
  await expect(page.getByText("证据被退回，请补充")).toBeVisible();
  const state = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)!), storageKey);
  expect(state.actions.find((item: { id: string }) => item.id === "member-recall").status).toBe("returned");
});

test("完整行动、区域验收后自动进入真实¥100,600收官", async ({ page }) => {
  test.setTimeout(90_000);
  await openDemo(page);
  await completeMeeting(page);
  await completeRecallToRegionalReview(page);
  await completeReservationToRegionalReview(page);
  await switchRole(page, "林阳区域经理");
  await approveRegionalAction(page, /向180位会员发送召回内容/);
  await approveRegionalAction(page, /跟进10桌未确认预约/);
  await switchRole(page, "黄店长");
  await completeExperienceToRegionalReview(page);
  await switchRole(page, "林阳区域经理");
  await approveRegionalAction(page, /店长关注10桌顾客体验/);
  await switchRole(page, "黄店长");
  await page.getByRole("button", { name: "今日", exact: true }).click();
  await expect(page.getByText("¥100,600").first()).toBeVisible();
  await expect(page.getByText("已改善").first()).toBeVisible();
  const state = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)!), storageKey);
  expect(state.operatingStage).toBe("closingReview");
  expect(state.dailyReview.actualRevenue).toBe(100600);
  expect(state.dailyReview.outcome).toBe("improved");
  expect(state.actions.filter((item: { id: string; status: string }) => ["member-recall", "reservation-followup", "dinner-experience"].includes(item.id) && item.status === "closed")).toHaveLength(3);
});

test("区域向上转总部后，总部人工回复资源方案同步回门店", async ({ page }) => {
  await openDemo(page);
  await submitSupportRequest(page);
  await switchRole(page, "林阳区域经理");
  await page.getByRole("button", { name: /现在处理/ }).click();
  await page.getByRole("button", { name: /转总部市场中心/ }).click();
  await waitForBusy(page);
  await switchRole(page, "总部经营中心");
  await page.getByRole("navigation", { name: "底部导航" }).getByRole("button", { name: /需求/ }).click();
  await page.getByRole("button", { name: /申请晚市补充曝光支持/ }).click();
  await page.getByRole("button", { name: "人工确认并回复方案" }).click();
  await waitForBusy(page);
  const state = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)!), storageKey);
  expect(state.workRequests[0].status).toBe("hqReplied");
  expect(state.notifications.some((item: { id: string }) => item.id === "notice-hq-reply")).toBe(true);
});

test("总部策略新版本只有人工发布后才同步门店并保留审计记录", async ({ page }) => {
  await openDemo(page);
  await switchRole(page, "总部经营中心");
  await page.getByRole("button", { name: "校准行动模板" }).click();
  await page.getByRole("button", { name: "查看AI修改草稿" }).click();
  let state = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)!), storageKey);
  expect(state.templates.find((item: { id: string }) => item.id === "template-member-recall").version).toBe(3);
  await page.getByRole("button", { name: "人工确认并发布新版本" }).click();
  await waitForBusy(page);
  state = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)!), storageKey);
  expect(state.templates.find((item: { id: string }) => item.id === "template-member-recall").version).toBe(4);
  expect(state.approvals.some((item: { entityType: string; decision: string }) => item.entityType === "template" && item.decision === "published")).toBe(true);
  expect(state.activity.some((item: { event: string }) => item.event.includes("发布策略 v4.0"))).toBe(true);
});

test("学院按当前问题匹配案例并可加入今日经营行动", async ({ page }) => {
  await openDemo(page);
  await page.getByRole("button", { name: "学院", exact: true }).click();
  await expect(page.getByRole("heading", { name: "会员不是名单，要能被找到和再次触达" })).toBeVisible();
  await page.getByRole("button", { name: "加入今日行动" }).click();
  await expect(page.getByRole("heading", { name: "每一步都从经营问题出发" })).toBeVisible();
});

test("五类周麻婆案例均可查询且当前节点只主动出现一个", async ({ page }) => {
  await openDemo(page);
  const state = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)!), storageKey);
  expect(state.knowledgeCases).toHaveLength(5);
  expect(new Set(state.knowledgeCases.map((item: { topic: string }) => item.topic))).toEqual(new Set(["traffic", "rating", "people", "product", "support"]));
  await page.getByRole("button", { name: /周麻婆知识匹配/ }).click();
  await expect(page.getByRole("heading", { name: "会员不是名单，要能被找到和再次触达" })).toBeVisible();
  await expect(page.locator(".knowledge-detail-hero")).toHaveCount(1);
});

test("收官复盘严格区分预测与实际并生成人工确认记录", async ({ page }) => {
  await openDemo(page);
  await page.getByRole("button", { name: "我的", exact: true }).click();
  await page.getByRole("button", { name: "21:30" }).click();
  await page.getByRole("button", { name: "今日", exact: true }).click();
  await page.getByRole("button", { name: "查看复盘" }).click();
  await page.getByRole("button", { name: "生成今日经营复盘" }).click();
  await waitForBusy(page);
  await expect(page.getByText("目标").first()).toBeVisible();
  await expect(page.getByText("实际").first()).toBeVisible();
  await page.getByRole("button", { name: "人工确认并生成日报" }).click();
  const state = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)!), storageKey);
  expect(state.dailyReview.actualRevenue).toBe(94100);
  expect(state.dailyReview.outcome).toBe("partial");
  expect(state.dailyReview.generated).toBe(true);
  expect(state.approvals.some((item: { entityId: string }) => item.entityId === "closing-review")).toBe(true);
});

test("手动跳到收官但未完成动作时不会伪造¥100,600", async ({ page }) => {
  await openDemo(page);
  await page.getByRole("button", { name: "我的", exact: true }).click();
  await page.getByRole("button", { name: "21:30" }).click();
  await page.getByRole("button", { name: "今日", exact: true }).click();
  await expect(page.getByText("¥94,100")).toBeVisible();
  await expect(page.getByText("未完全闭环")).toBeVisible();
  const body = await page.locator("body").innerText();
  expect(body).not.toContain("¥100,600");
});

test("收官页顺序为经营改善、明日动作、成长证据", async ({ page }) => {
  await openDemo(page);
  await page.getByRole("button", { name: "我的", exact: true }).click();
  await page.getByRole("button", { name: "21:30" }).click();
  await page.getByRole("button", { name: "今日", exact: true }).click();
  await page.getByRole("button", { name: "查看复盘" }).click();
  await page.getByRole("button", { name: "生成今日经营复盘" }).click();
  await waitForBusy(page);
  const order = await page.locator(".final-detail-page").evaluate((root) => {
    const result = root.querySelector(".final-result-card")!.getBoundingClientRect().top;
    const tomorrow = root.querySelector(".tomorrow-action")!.getBoundingClientRect().top;
    const growth = root.querySelector(".closing-growth-evidence")!.getBoundingClientRect().top;
    return { result, tomorrow, growth };
  });
  expect(order.result).toBeLessThan(order.tomorrow);
  expect(order.tomorrow).toBeLessThan(order.growth);
});

test("终局进度刷新保留，重置只清终局键且恢复08:30", async ({ page }) => {
  await openDemo(page);
  await completeMeeting(page);
  await page.reload();
  await expect(page.getByRole("button", { name: "拍照复查" })).toBeVisible();
  await page.evaluate(() => {
    window.localStorage.setItem("zhoumapo-manager-assistant-v4", "preserve-v4");
    window.localStorage.setItem("zhoumapo-manager-assistant-final-v1", "preserve-v5");
  });
  await page.getByRole("button", { name: "我的", exact: true }).click();
  await page.getByRole("button", { name: /重置终局演示/ }).click();
  await page.getByRole("button", { name: "确认重置" }).click();
  await expect(page.getByRole("heading", { name: "黄店长，早上好" })).toBeVisible();
  expect(await page.evaluate(() => window.localStorage.getItem("zhoumapo-manager-assistant-v4"))).toBe("preserve-v4");
  expect(await page.evaluate(() => window.localStorage.getItem("zhoumapo-manager-assistant-final-v1"))).toBe("preserve-v5");
});

test("320、393、412、427宽度无横向溢出且可见按钮触控高度不小于44", async ({ page }) => {
  for (const width of [320, 393, 412, 427]) {
    await openDemo(page, width, 852);
    const layout = await page.evaluate(() => {
      const screen = document.querySelector<HTMLElement>(".direct-app-screen")!;
      const main = document.querySelector<HTMLElement>("main")!;
      const buttons = [...document.querySelectorAll<HTMLElement>("button")].filter((item) => {
        const style = getComputedStyle(item);
        const rect = item.getBoundingClientRect();
        return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
      });
      return {
        screenOverflow: screen.scrollWidth - screen.clientWidth,
        mainOverflow: main.scrollWidth - main.clientWidth,
        smallestButton: Math.min(...buttons.map((item) => item.getBoundingClientRect().height)),
      };
    });
    expect(layout.screenOverflow).toBeLessThanOrEqual(1);
    expect(layout.mainOverflow).toBeLessThanOrEqual(1);
    expect(layout.smallestButton).toBeGreaterThanOrEqual(43.5);
  }
});

test("减少动态效果时停止长动画且核心交互仍可用", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openDemo(page);
  const duration = await page.locator(".ai-card-identity > svg").evaluate((element) => getComputedStyle(element).animationDuration);
  expect(Number.parseFloat(duration)).toBeLessThan(0.01);
  await page.getByRole("button", { name: "开始晨会", exact: true }).click();
  await expect(page.getByRole("button", { name: "开始语音晨会" })).toBeVisible();
});
