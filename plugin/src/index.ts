/**
 * @dsh-external/dsh-novel-workbench — 守护循环形态（由 dev_scaffold_plugin 生成）。
 * 小 agent loop：timer 驱动自主循环 → 观察 → LLM 决策 → 行动 → 再睡。
 * 插件自身的提示词/循环参数皆可自我优化（改 → build → dev_reload_package）。
 */
import type { Context } from 'cordis'
import type LlmService from '@deepseek-ai/dsh-llm'
import { createUserMessage, ReasoningEffortId } from '@deepseek-ai/dsh-llm'
import { appendFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import z from 'schemastery'

type AppContext = Context & {
  llm: LlmService
  setInterval(fn: () => void, ms: number): any
}

export const name = "@dsh-external/dsh-novel-workbench"
export const inject = ['timer', 'llm']

export interface Config {
  intervalMs: number
  logFile: string
  watchFile: string
}

export const Config = z.object({
  intervalMs: z.number().min(5000).default(60000),
  logFile: z.string().default(''),
  watchFile: z.string().default(''),
})

export function apply(ctx: AppContext, config: Config): void {
  // 短名（去 scope）：日志文件名不能含 '/'（会变成子路径）
  const SHORT = "dsh-novel-workbench"
  const logFile = config.logFile || join(homedir(), '.dsh', 'super-injector', SHORT + '.log')
  const watchFile = config.watchFile || join(homedir(), '.dsh', 'super-injector', 'self-heal.log')
  let cycles = 0
  let llmCalls = 0
  let lastRoute: { provider: string; model: string } | null = null

  const log = (msg: string): void => {
    try {
      mkdirSync(dirname(logFile), { recursive: true })
      appendFileSync(logFile, '[' + new Date().toISOString() + '] ' + msg + '\n')
    } catch { /* 日志失败静默 */ }
  }

  // 观察面：捕获主模型路由（waterfall 必须 next() 委托）
  ctx.on('llm/stream', (options, next) => {
    lastRoute = { provider: options.provider, model: options.model }
    return next()
  })

  async function decideWithLlm(tail: string): Promise<string> {
    if (!lastRoute) return '无可用 LLM 路由（未捕获到主模型调用），跳过决策'
    llmCalls += 1
    try {
      let text = ''
      const stream = ctx.llm.stream({
        provider: lastRoute.provider,
        model: lastRoute.model,
        system: '你是守护 agent。分析给定日志尾部，判断是否需要人工介入。直接输出结论：需介入（10 字内原因）/ OK。',
        messages: [createUserMessage({ source: { kind: 'user' }, content: [{ type: 'text', text: tail.slice(0, 800) }] })],
        temperature: 0,
        reasoningEffort: ReasoningEffortId('off'),
        maxTokens: 200,
      })
      for await (const chunk of stream) {
        if (chunk.type === 'text-delta') text += chunk.text
      }
      return text.trim().slice(0, 60) || 'LLM 无输出'
    } catch (e) {
      return 'LLM 调用失败: ' + String(e).slice(0, 40)
    }
  }

  // ═══ 小 agent loop：每 intervalMs 醒来 → 观察 → 决策 → 行动 → 再睡 ═══
  ctx.setInterval(() => {
    void (async () => {
      cycles += 1
      let tail = ''
      try {
        const { readFileSync } = await import('node:fs')
        const t = readFileSync(watchFile, 'utf8').trim().split('\n')
        tail = t.slice(-3).join('\n')
      } catch { /* 无观察源 */ }
      let decision: string
      if (tail.includes('heal-failed') || tail.includes('reboot-failed')) {
        decision = await decideWithLlm(tail)
      } else {
        decision = 'OK（无异常，LLM 未唤醒）'
      }
      log('cycle=' + cycles + ' llmCalls=' + llmCalls + ' decision=' + decision)
    })().catch((e) => log('loop error: ' + String(e)))
  }, config.intervalMs)

  ctx.logger?.info?.('[' + "@dsh-external/dsh-novel-workbench" + '] 守护循环启动（每 ' + config.intervalMs + 'ms 一轮）')
}
