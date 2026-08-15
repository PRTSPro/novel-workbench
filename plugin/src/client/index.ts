// 镜像文件：由 scripts/build.js 从 plugin-source.json 生成。
// 实际运行产物 = lib/client.js（ModuleLoader 包裹版）。
// 本文件保留骨架特征（export const inject + register name）供注入器预检。
export const inject = ['slots', 'timer']
const __mirror = (function () {
return {
  name: 'novel-assistant-v10-ui',
  inject: ['slots', 'timer'],
  apply(ctx) {
    console.log('[novel-assistant] client v10 apply 开始')
    const slots = ctx.get('slots')
    if (slots === undefined) { console.error('[novel-assistant] slots 服务不可用'); return }
    console.log('[novel-assistant] slots 已获取')
    function h(type, props) {
      var args = [type, props]
      for (var i = 2; i < arguments.length; i++) args.push(arguments[i])
      return React.createElement.apply(null, args)
    }
    // ================= 样式与常量 =================
    const ST = {
      text: '#1f2329', sub: '#6b7280', line: '#e3e6ea', colBg: '#f6f7f9',
      accent: '#4f6ef7', danger: '#e5484d', ok: '#2e9e5b', warn: '#d97706',
      chip: { padding: '3px 10px', borderRadius: 12, fontSize: 12, border: '1px solid #e3e6ea', background: '#fff', cursor: 'pointer', color: '#1f2329' },
      chipOn: { padding: '3px 10px', borderRadius: 12, fontSize: 12, border: '1px solid #4f6ef7', background: '#eef1fe', cursor: 'pointer', color: '#4f6ef7', fontWeight: 600 },
      btn: { padding: '5px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: '1px solid #d0d5dd', background: '#fff', color: '#1f2329' },
      btnPrimary: { padding: '5px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: '1px solid #4f6ef7', background: '#4f6ef7', color: '#fff' },
      btnDanger: { padding: '5px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: '1px solid #e5484d', background: '#e5484d', color: '#fff' },
      input: { width: '100%', boxSizing: 'border-box', padding: '5px 8px', borderRadius: 6, border: '1px solid #d0d5dd', fontSize: 12, background: '#fff', color: '#1f2329' },
      label: { fontSize: 11, color: '#6b7280', marginTop: 8, marginBottom: 3, display: 'block' },
      card: { background: '#fff', border: '1px solid #e3e6ea', borderRadius: 8, padding: '8px 10px', marginBottom: 6 },
      badge: { display: 'inline-block', padding: '1px 8px', borderRadius: 10, fontSize: 11, marginRight: 6, fontWeight: 600 },
    }
    const TYPE_LABEL = { world: '世界观', character: '人物', faction: '势力', power: '力量体系', location: '地点', item: '物品', timeline: '时间线', other: '其他' }
    const TYPE_COLOR = { '开端': '#4f6ef7', '发展': '#2e9e5b', '转折': '#d97706', '高潮': '#e5484d', '收束': '#7c5cd6', '结局': '#0e7490', '支线': '#64748b', '其他': '#64748b' }
    const SEED_STATUS_LABEL = { planted: '已埋设', growing: '成长中', payoff: '已回收', abandoned: '已放弃' }
    const SEED_STATUS_COLOR = { planted: '#4f6ef7', growing: '#d97706', payoff: '#2e9e5b', abandoned: '#9ca3af' }
    const VERDICT_COLOR = { '大成功': '#2e9e5b', '成功': '#4f6ef7', '部分成功': '#d97706', '失败': '#e5484d', '大失败': '#b91c1c' }
    const FOCUSES = ['武力', '术法', '智谋', '交涉', '隐秘', '感知', '意志', '其他']
    const VERDICTS = ['大成功', '成功', '部分成功', '失败', '大失败']
    const CERTAINTIES = ['必然', '很可能', '可能', '低']
    const CANDIDATE_KIND_COLOR = { '补全人物': '#7c5cd6', '补全势力': '#0e7490', '新建设定': '#4f6ef7', '新增字段': '#d97706', '关联设定': '#2e9e5b' }
    // ================= 基础表单控件 =================
    function L(props) { return h('label', { style: ST.label }, props.text) }
    function I(props) { return h('input', Object.assign({}, props, { style: ST.input })) }
    function TA(props) { return h('textarea', Object.assign({}, props, { style: Object.assign({}, ST.input, { minHeight: 40, resize: 'vertical' }) })) }
    function SEL(props) {
      var kids = []
      for (var i = 1; i < arguments.length; i++) kids.push(arguments[i])
      return h.apply(null, ['select', Object.assign({}, props, { style: ST.input })].concat(kids))
    }
    function splitLines(t) { return String(t || '').split('\n').map(function (x) { return x.trim() }).filter(function (x) { return x }) }
    function splitCsv(t) { return String(t || '').split(/[,，\n]/).map(function (x) { return x.trim() }).filter(function (x) { return x }) }
    // ================= 数据钩子 =================
    async function rpcPing() {
      if (typeof host === 'undefined' || !host.call) return 'host builtin 缺失'
      try { const v = await host.call('ping', {}); return v === 'pong' ? '服务正常' : '异常返回:' + String(v) }
      catch (e) { return '失败:' + String((e && e.message) || e) }
    }
    async function loadState() {
      if (typeof host === 'undefined' || !host.call) throw new Error('host RPC 不可用')
      const d = await host.call('get-state', {})
      if (!d || !d.meta) throw new Error('get-state 返回了空数据')
      return d
    }
    async function loadLayout() {
      if (typeof host === 'undefined' || !host.call) throw new Error('host RPC 不可用')
      return host.call('get-layout', {})
    }
    function useWorkbench() {
      const [data, setData] = React.useState(null)
      const [layout, setLayout] = React.useState(null)
      const [err, setErr] = React.useState('')
      const [ping, setPing] = React.useState('检测中…')
      const [busy, setBusy] = React.useState(false)
      React.useEffect(function () {
        let alive = true
        const run = async function () {
          let d = null, l = null, e = ''
          try { d = await loadState() } catch (x) { e = String((x && x.message) || x) }
          try { l = await loadLayout() } catch (x) { if (!e) e = String((x && x.message) || x) }
          if (!alive) return
          if (d) { setData(d); setLayout(l); setErr(e) } else { setErr(e || '无法获取数据') }
        }
        rpcPing().then(function (r) { if (alive) setPing(r) }, function (x) { if (alive) setPing(String((x && x.message) || x)) })
        run()
        let stop = function () {}
        try { stop = ctx.interval(run, 8000) } catch (x) { console.error('[novel-assistant] interval 失败:', x) }
        return function () { alive = false; stop() }
      }, [])
      const refresh = function () {
        let d = null, l = null, e = ''
        return Promise.all([
          rpcPing().then(function (r) { setPing(r) }, function (x) { setPing(String((x && x.message) || x)) }),
          loadState().then(function (x) { d = x }, function (x) { e = String((x && x.message) || x) }),
          loadLayout().then(function (x) { l = x }, function (x) { if (!e) e = String((x && x.message) || x) }),
        ]).then(function () {
          if (d) { setData(d); setLayout(l); setErr(e) } else { setErr(e || '无法获取数据') }
        })
      }
      const op = function (handler, payload) {
        if (typeof host === 'undefined' || !host.call) return Promise.reject(new Error('host RPC 不可用'))
        setBusy(true)
        return host.call(handler, payload).then(function (r) {
          if (r && r.ok === false) throw new Error(r.message || r.reason || '操作失败')
          return refresh().then(function () { return r })
        }, function (x) { throw new Error(String((x && x.message) || x)) })
          .then(function (r) { setBusy(false); return r }, function (e) { setBusy(false); throw e })
      }
      return { data, layout, err, refresh, ping, op, busy }
    }
    // ================= 设定管理（左栏） =================
    function SettingFormView(props) {
      const initial = props.initial
      const [name, setName] = React.useState(initial.name || '')
      const [type, setType] = React.useState(initial.type || 'world')
      const [summary, setSummary] = React.useState(initial.summary || '')
      const [fieldsText, setFieldsText] = React.useState((initial.fields || []).join('\n'))
      const [relationsText, setRelationsText] = React.useState((initial.relations || []).join('\n'))
      const [tagsText, setTagsText] = React.useState((initial.tags || []).join('，'))
      const [error, setError] = React.useState('')
      const [saving, setSaving] = React.useState(false)
      const [confirmRemove, setConfirmRemove] = React.useState(false)
      const save = function () {
        if (!name.trim()) { setError('名称不能为空'); return }
        setSaving(true); setError('')
        props.onSave({
          id: initial.id || undefined,
          name: name.trim(),
          type: type,
          summary: summary.trim(),
          fields: splitLines(fieldsText),
          relations: splitLines(relationsText),
          tags: splitCsv(tagsText),
        }).then(function () {}, function (e) { setError(String((e && e.message) || e)); setSaving(false) })
      }
      const remove = function () {
        if (!confirmRemove) { setConfirmRemove(true); return }
        setSaving(true)
        props.onRemove(initial.id).then(function () {}, function (e) { setError(String((e && e.message) || e)); setSaving(false) })
      }
      return h('div', null,
        h('div', { style: { fontSize: 13, fontWeight: 700, color: ST.text, marginBottom: 4 } }, (initial.id ? '编辑设定' : '新建设定')),
        L({ text: '名称' }), I({ value: name, onChange: function (e) { setName(e.target.value) }, placeholder: '设定名称' }),
        L({ text: '类型' }),
        SEL({ value: type, onChange: function (e) { setType(e.target.value) } }, Object.keys(TYPE_LABEL).map(function (t) { return h('option', { key: t, value: t }, TYPE_LABEL[t]) })),
        L({ text: '一句话概述' }), TA({ value: summary, onChange: function (e) { setSummary(e.target.value) }, rows: 2, placeholder: '能力、立场、作用等结构化信息' }),
        L({ text: '字段（每行一个 键：值）' }), TA({ value: fieldsText, onChange: function (e) { setFieldsText(e.target.value) }, rows: 4, placeholder: '状态：存活\n境界：筑基' }),
        L({ text: '关系（每行一个 目标id 关系）' }), TA({ value: relationsText, onChange: function (e) { setRelationsText(e.target.value) }, rows: 3, placeholder: 'c2 是 c3 的师父' }),
        L({ text: '标签（逗号分隔）' }), I({ value: tagsText, onChange: function (e) { setTagsText(e.target.value) } }),
        error ? h('div', { style: { color: ST.danger, fontSize: 12, marginTop: 6 } }, error) : null,
        h('div', { style: { marginTop: 10, display: 'flex', gap: 8 } },
          h('button', { style: ST.btnPrimary, onClick: save, disabled: saving }, saving ? '保存中…' : '保存'),
          h('button', { style: ST.btn, onClick: props.onCancel }, '取消'),
          initial.id ? h('button', { style: Object.assign({}, ST.btnDanger, { marginLeft: 'auto' }), onClick: remove }, confirmRemove ? '确认删除？' : '删除') : null,
        ),
      )
    }
    function SettingPanel(props) {
      const [filter, setFilter] = React.useState('all')
      const [editing, setEditing] = React.useState(null)
      const data = props.data
      if (editing) {
        return h('div', null,
          h(SettingFormView, {
            initial: editing,
            onSave: function (card) { return props.op('setting-save', { card: card }).then(function () { setEditing(null) }) },
            onCancel: function () { setEditing(null) },
            onRemove: function (id) { return props.op('setting-remove', { id: id }).then(function () { setEditing(null) }) },
          }),
        )
      }
      const types = ['all'].concat(Object.keys(TYPE_LABEL))
      const countOf = function (t) { return t === 'all' ? data.settings.length : data.settings.filter(function (s) { return s.type === t }).length }
      const list = data.settings.filter(function (s) { return filter === 'all' || s.type === filter })
      return h('div', null,
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 } },
          h('span', { style: { fontSize: 13, fontWeight: 700, color: ST.text } }, '设定管理（' + data.settings.length + '）'),
          h('button', { style: ST.btnPrimary, onClick: function () { setEditing({ id: null, type: 'world', name: '', summary: '', fields: [], relations: [], tags: [] }) } }, '＋ 新建设定'),
        ),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 } },
          types.map(function (t) {
            const n = countOf(t)
            return h('button', { key: t, style: filter === t ? ST.chipOn : ST.chip, onClick: function () { setFilter(t) } },
              TYPE_LABEL[t] || '全部', n ? h('span', { style: { marginLeft: 4, opacity: 0.65 } }, n) : null)
          }),
        ),
        list.length ? list.map(function (s) {
          return h('div', {
            key: s.id, style: Object.assign({}, ST.card, { cursor: 'pointer' }),
            onClick: function () { setEditing({ id: s.id, type: s.type, name: s.name, summary: s.summary || '', fields: s.fields || [], relations: s.relations || [], tags: s.tags || [] }) },
          },
            h('div', { style: { display: 'flex', alignItems: 'center' } },
              h('span', { style: Object.assign({}, ST.badge, { background: '#eef1fe', color: '#4f6ef7' }) }, TYPE_LABEL[s.type] || s.type),
              h('span', { style: { fontSize: 12.5, fontWeight: 600, color: ST.text } }, s.name),
              h('span', { style: { marginLeft: 'auto', fontSize: 11, color: ST.sub } }, s.id),
            ),
            s.summary ? h('div', { style: { fontSize: 11.5, color: ST.sub, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, s.summary) : null,
          )
        }) : h('div', { style: { fontSize: 12, color: ST.sub, padding: 8 } }, '暂无设定'),
      )
    }
    // ================= 推演（场景面板） =================
    function ScenePanel(props) {
      const data = props.data
      const op = props.op
      const session = data.session || { activeSceneId: '' }
      const scene = data.scenes.find(function (s) { return s.id === session.activeSceneId }) || null
      const [view, setView] = React.useState('view')
      const [msg, setMsg] = React.useState('')
      const nameOf = function (id) { const s = data.settings.find(function (x) { return x.id === id }); return s ? s.name : id }
      const err = function (e) { setMsg(String((e && e.message) || e)) }
      if (view === 'new') {
        return h(NewSceneForm, {
          data: data, op: op, onBack: function () { setView('view') }, onMsg: function (m) { setMsg(m) },
        })
      }
      if (view === 'act') {
        return h(ActForm, {
          data: data, scene: scene, op: op, onBack: function () { setView('view') }, onMsg: function (m) { setMsg(m) },
        })
      }
      if (view === 'end') {
        return h(EndSceneForm, {
          data: data, scene: scene, op: op, onBack: function () { setView('view') }, onMsg: function (m) { setMsg(m) },
        })
      }
      const openScenes = data.scenes.filter(function (s) { return s.status === 'open' })
      return h('div', null,
        msg ? h('div', { style: { background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 6, padding: '6px 10px', marginBottom: 8, fontSize: 11.5, color: '#3730a3', whiteSpace: 'pre-wrap', lineHeight: 1.5 } }, msg) : null,
        scene ? h('div', { style: Object.assign({}, ST.card, { border: '1px solid #4f6ef7', background: '#f8faff' }) },
          h('div', { style: { display: 'flex', alignItems: 'center' } },
            h('span', { style: Object.assign({}, ST.badge, { background: '#4f6ef7', color: '#fff' }) }, '进行中'),
            h('span', { style: { fontSize: 13, fontWeight: 700, color: ST.text } }, scene.title),
            h('span', { style: { marginLeft: 'auto', fontSize: 11, color: ST.sub } }, '检定 ' + (scene.checks || []).length + ' 次'),
          ),
          h('div', { style: { fontSize: 12, color: '#374151', marginTop: 4, lineHeight: 1.55 } }, scene.situation),
          scene.dramatic_question ? h('div', { style: { fontSize: 12, color: '#7c5cd6', marginTop: 4, fontWeight: 600 } }, '？' + scene.dramatic_question) : null,
          (scene.participants || []).length ? h('div', { style: { fontSize: 11, color: ST.sub, marginTop: 3 } }, '在场：' + scene.participants.map(nameOf).join('、')) : null,
          (scene.hooks || []).length ? h('div', { style: { fontSize: 11, color: ST.sub, marginTop: 2 } }, '线索：' + scene.hooks.join('；')) : null,
          (scene.constraints && scene.constraints.length) ? h('div', { style: { fontSize: 11, color: ST.sub, marginTop: 2 } }, '约束：' + scene.constraints.map(nameOf).join('、')) : null,
          scene.stakes ? h('div', { style: { fontSize: 11, color: '#b45309', marginTop: 2 } }, '赌注：' + scene.stakes) : null,
          (scene.outcomeEvents && scene.outcomeEvents.length) ? h('div', { style: { fontSize: 11, color: ST.sub, marginTop: 2 } }, '事件：' + scene.outcomeEvents.join('、')) : null,
          h('div', { style: { marginTop: 8, display: 'flex', gap: 8 } },
            h('button', { style: ST.btnPrimary, onClick: function () { setView('act'); setMsg('') } }, '行动裁决'),
            h('button', { style: ST.btn, onClick: function () { setView('end'); setMsg('') } }, '收束场景'),
          ),
          (scene.checks || []).length ? h('div', { style: { marginTop: 10 } },
            h('div', { style: { fontSize: 12, fontWeight: 700, color: ST.text, marginBottom: 4 } }, '检定记录'),
            scene.checks.map(function (ck) {
              return h('div', { key: ck.id, style: { border: '1px solid #e3e6ea', borderRadius: 6, padding: '6px 8px', marginBottom: 4, background: '#fff' } },
                h('div', { style: { display: 'flex', alignItems: 'center' } },
                  h('span', { style: Object.assign({}, ST.badge, { background: VERDICT_COLOR[ck.verdict] || '#64748b', color: '#fff' }) }, ck.verdict),
                  h('span', { style: { fontSize: 11, color: ST.sub, marginRight: 6 } }, (ck.certainty || '') + ' · ' + (ck.focus || '其他')),
                  h('span', { style: { fontSize: 12, fontWeight: 600, color: ST.text } }, (ck.actor === 'env' ? '环境' : nameOf(ck.actor)) + '「' + ck.action + '」'),
                  h('span', { style: { marginLeft: 'auto', fontSize: 11, color: ST.sub } }, ck.eventId),
                ),
                h('div', { style: { fontSize: 11.5, color: '#374151', marginTop: 3, lineHeight: 1.5 } }, '目标：' + ck.goal + ' → ' + ck.outcome),
                (ck.reasons && ck.reasons.length) ? h('div', { style: { fontSize: 11, color: ST.sub, marginTop: 2, lineHeight: 1.5 } }, '依据：' + ck.reasons.join('；')) : null,
                (ck.world_delta && ck.world_delta.length) ? h('div', { style: { fontSize: 11, color: '#b45309', marginTop: 1, lineHeight: 1.4 } }, '变化：' + ck.world_delta.join('；')) : null,
              )
            }),
          ) : null,
        ) : h('div', { style: { fontSize: 12, color: ST.sub, padding: 8 } }, '当前没有进行中的场景。'),
        openScenes.length ? h('div', { style: { marginTop: 10 } },
          h('div', { style: { fontSize: 12, fontWeight: 700, color: ST.text, marginBottom: 4 } }, '其他场景'),
          openScenes.map(function (s) {
            if (scene && s.id === scene.id) return null
            return h('div', { key: s.id, style: ST.card }, s.title + '（' + (s.checks || []).length + ' 次检定）')
          }),
        ) : null,
        h('div', { style: { marginTop: 10 } },
          h('button', { style: ST.btnPrimary, onClick: function () { setView('new'); setMsg('') } }, '＋ 开新场景'),
        ),
        (function () {
          const pb = data.events.filter(function (e) { return e.status === 'candidate' }).length
          const pc = (data.candidates || []).filter(function (c) { return c.status === 'pending' }).length
          if (!pb && !pc) return null
          const parts = []
          if (pb) parts.push('待决分支 ' + pb + ' 个（「事件链」标签页可采纳/否决）')
          if (pc) parts.push('设定候选 ' + pc + ' 条（「推理」标签页可处理）')
          return h('div', { style: { marginTop: 10, background: '#fffaf0', border: '1px solid #fde68a', borderRadius: 6, padding: '6px 10px', fontSize: 11.5, color: '#92400e', lineHeight: 1.5 } }, '⏳ ' + parts.join('；'))
        })(),
        (data.log && data.log.length) ? h('div', { style: { marginTop: 12 } },
          h('div', { style: { fontSize: 12, fontWeight: 700, color: ST.text, marginBottom: 4 } }, '最近操作'),
          data.log.slice(-8).map(function (l, i) {
            return h('div', { key: i, style: { fontSize: 11, color: ST.sub, marginBottom: 2, lineHeight: 1.45 } }, l.tool + '：' + l.note)
          }),
        ) : null,
      )
    }
    function NewSceneForm(props) {
      const [title, setTitle] = React.useState('')
      const [situation, setSituation] = React.useState('')
      const [dq, setDq] = React.useState('')
      const [participants, setParticipants] = React.useState('')
      const [location, setLocation] = React.useState('')
      const [constraints, setConstraints] = React.useState('')
      const [hooks, setHooks] = React.useState('')
      const [stakes, setStakes] = React.useState('')
      const [saving, setSaving] = React.useState(false)
      const chars = props.data.settings.filter(function (s) { return s.type === 'character' })
      const locs = props.data.settings.filter(function (s) { return s.type === 'location' })
      const save = function () {
        if (!title.trim() || !situation.trim()) { props.onMsg('场景名与局势必填'); return }
        setSaving(true)
        props.op('scene-start', {
          title: title.trim(), situation: situation.trim(), dramatic_question: dq.trim(),
          participants: splitCsv(participants), location: location.trim(), constraints: splitCsv(constraints),
          hooks: splitLines(hooks), stakes: stakes.trim(),
        }).then(function (r) { props.onMsg('场景已开启：' + r.title); props.onBack() }, function (e) { setSaving(false); props.onMsg(String((e && e.message) || e)) })
      }
      return h('div', null,
        h('div', { style: { fontSize: 13, fontWeight: 700, color: ST.text, marginBottom: 4 } }, '开新场景'),
        L({ text: '场景名' }), I({ value: title, onChange: function (e) { setTitle(e.target.value) }, placeholder: '如 镇火司搜查之夜' }),
        L({ text: '开场局势' }), TA({ value: situation, onChange: function (e) { setSituation(e.target.value) }, rows: 3, placeholder: '谁在哪、发生什么、迫在眉睫的威胁或机会' }),
        L({ text: '戏剧性问题' }), I({ value: dq, onChange: function (e) { setDq(e.target.value) }, placeholder: '本场景要回答的悬念' }),
        L({ text: '在场人物（逗号分隔 id）' }),
        SEL({ value: participants, onChange: function (e) { setParticipants(e.target.value) } },
          h('option', { value: '' }, '（可选）'),
          chars.map(function (c) { return h('option', { key: c.id, value: c.id }, c.name + ' (' + c.id + ')') })),
        L({ text: '地点' }),
        SEL({ value: location, onChange: function (e) { setLocation(e.target.value) } },
          h('option', { value: '' }, '（可选）'),
          locs.map(function (l) { return h('option', { key: l.id, value: l.id }, l.name + ' (' + l.id + ')') })),
        L({ text: '约束铁律 id（逗号分隔）' }), I({ value: constraints, onChange: function (e) { setConstraints(e.target.value) }, placeholder: '如 s1,s5' }),
        L({ text: '线索钩子（每行一条）' }), TA({ value: hooks, onChange: function (e) { setHooks(e.target.value) }, rows: 2 }),
        L({ text: '赌注' }), I({ value: stakes, onChange: function (e) { setStakes(e.target.value) }, placeholder: '输赢各失去什么' }),
        h('div', { style: { marginTop: 10, display: 'flex', gap: 8 } },
          h('button', { style: ST.btnPrimary, onClick: save, disabled: saving }, saving ? '开启中…' : '开启场景'),
          h('button', { style: ST.btn, onClick: props.onBack }, '取消'),
        ),
      )
    }
    function ActForm(props) {
      const data = props.data
      const scene = props.scene
      const chars = data.settings.filter(function (s) { return s.type === 'character' })
      const [actor, setActor] = React.useState('')
      const [action, setAction] = React.useState('')
      const [goal, setGoal] = React.useState('')
      const [approach, setApproach] = React.useState('')
      const [focus, setFocus] = React.useState('其他')
      const [verdict, setVerdict] = React.useState('成功')
      const [certainty, setCertainty] = React.useState('可能')
      const [outcome, setOutcome] = React.useState('')
      const [reasons, setReasons] = React.useState('')
      const [deltas, setDeltas] = React.useState('')
      const [branch, setBranch] = React.useState(false)
      const [etype, setEtype] = React.useState('发展')
      const [saving, setSaving] = React.useState(false)
      const save = function () {
        if (!actor || !action.trim() || !goal.trim() || !outcome.trim()) { props.onMsg('行动者/行动/目标/结果必填'); return }
        setSaving(true)
        props.op('scene-act', {
          scene_id: scene.id, actor: actor, action: action.trim(), goal: goal.trim(), approach: approach.trim(),
          focus: focus, verdict: verdict, certainty: certainty, outcome: outcome.trim(),
          reasons: splitLines(reasons), world_delta: splitLines(deltas), branch: branch, type: etype,
        }).then(function (r) {
          props.onMsg('检定已记录：' + r.eventId + '（' + (r.status === 'candidate' ? '候选分支' : '已采纳') + '）' + verdict + '（' + certainty + '）')
          setAction(''); setGoal(''); setOutcome(''); setReasons(''); setDeltas(''); setBranch(false)
        }, function (e) { setSaving(false); props.onMsg(String((e && e.message) || e)) })
      }
      return h('div', null,
        h('div', { style: { fontSize: 13, fontWeight: 700, color: ST.text, marginBottom: 4 } }, '行动裁决｜' + scene.title),
        L({ text: '行动者' }),
        SEL({ value: actor, onChange: function (e) { setActor(e.target.value) } },
          h('option', { value: '' }, '（选择）'),
          h('option', { value: 'env' }, '环境 / 天灾'),
          chars.map(function (c) { return h('option', { key: c.id, value: c.id }, c.name + ' (' + c.id + ')') })),
        L({ text: '行动' }), I({ value: action, onChange: function (e) { setAction(e.target.value) }, placeholder: '谁做了什么（1 句）' }),
        L({ text: '目标' }), I({ value: goal, onChange: function (e) { setGoal(e.target.value) }, placeholder: '想达成什么' }),
        L({ text: '方式/策略（可选）' }), I({ value: approach, onChange: function (e) { setApproach(e.target.value) } }),
        h('div', { style: { display: 'flex', gap: 8 } },
          h('div', { style: { flex: 1 } }, L({ text: '侧重' }), SEL({ value: focus, onChange: function (e) { setFocus(e.target.value) } }, FOCUSES.map(function (f) { return h('option', { key: f, value: f }, f) }))),
          h('div', { style: { flex: 1 } }, L({ text: '裁决' }), SEL({ value: verdict, onChange: function (e) { setVerdict(e.target.value) } }, VERDICTS.map(function (v) { return h('option', { key: v, value: v }, v) }))),
          h('div', { style: { flex: 1 } }, L({ text: '置信度' }), SEL({ value: certainty, onChange: function (e) { setCertainty(e.target.value) } }, CERTAINTIES.map(function (c) { return h('option', { key: c, value: c }, c) }))),
        ),
        L({ text: '结果' }), TA({ value: outcome, onChange: function (e) { setOutcome(e.target.value) }, rows: 2, placeholder: '结果描述 1-3 句（结构化）' }),
        L({ text: '依据（每行一条，须引用设定/事件 id）' }), TA({ value: reasons, onChange: function (e) { setReasons(e.target.value) }, rows: 3, placeholder: 'c2 境界金丹，高于 c1 筑基\ns3 镇火令规定：发现燃石即缉捕' }),
        L({ text: '状态变化（每行 目标id:字段:旧值→新值）' }), TA({ value: deltas, onChange: function (e) { setDeltas(e.target.value) }, rows: 2, placeholder: 'c1:状态:存活→重伤' }),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 } },
          h('label', { style: { fontSize: 12, color: ST.text, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' } },
            h('input', { type: 'checkbox', checked: branch, onChange: function (e) { setBranch(e.target.checked) } }), '作为候选分支（待用户采纳）'),
          h('div', { style: { flex: 1 } }, L({ text: '事件类型' }), SEL({ value: etype, onChange: function (e) { setEtype(e.target.value) } }, Object.keys(TYPE_COLOR).map(function (t) { return h('option', { key: t, value: t }, t) }))),
        ),
        h('div', { style: { marginTop: 10, display: 'flex', gap: 8 } },
          h('button', { style: ST.btnPrimary, onClick: save, disabled: saving }, saving ? '裁决中…' : '提交检定'),
          h('button', { style: ST.btn, onClick: props.onBack }, '取消'),
        ),
        h('div', { style: { fontSize: 11, color: ST.sub, marginTop: 8, lineHeight: 1.5 } }, '校验规则：参与者必须存活；依据引用的 id 必须存在；world_delta 旧值必须与当前局势一致。裁决必须能被设定依据支持——不随机。' ),
      )
    }
    function EndSceneForm(props) {
      const scene = props.scene
      const [resolution, setResolution] = React.useState('')
      const [threads, setThreads] = React.useState('')
      const [saving, setSaving] = React.useState(false)
      const save = function () {
        if (!resolution.trim()) { props.onMsg('收束结果必填'); return }
        setSaving(true)
        props.op('scene-end', { scene_id: scene.id, resolution: resolution.trim(), threads: splitLines(threads) })
          .then(function () { props.onMsg('场景已收束'); props.onBack() }, function (e) { setSaving(false); props.onMsg(String((e && e.message) || e)) })
      }
      return h('div', null,
        h('div', { style: { fontSize: 13, fontWeight: 700, color: ST.text, marginBottom: 4 } }, '收束场景｜' + scene.title),
        L({ text: '收束结果' }), TA({ value: resolution, onChange: function (e) { setResolution(e.target.value) }, rows: 3, placeholder: '戏剧性问题如何回答、局势如何变化' }),
        L({ text: '未了结线索（每行一条，建议转伏笔或下个场景）' }), TA({ value: threads, onChange: function (e) { setThreads(e.target.value) }, rows: 3 }),
        h('div', { style: { marginTop: 10, display: 'flex', gap: 8 } },
          h('button', { style: ST.btnPrimary, onClick: save, disabled: saving }, saving ? '收束中…' : '收束'),
          h('button', { style: ST.btn, onClick: props.onBack }, '取消'),
        ),
      )
    }
    // ================= 剧情推演（事件链） =================
    function PlotPanel(props) {
      const data = props.data
      const evTitle = function (id) {
        if (!id) return ''
        const ev = data.events.find(function (x) { return x.id === id })
        return ev ? (ev.type + '·' + ev.title) : ''
      }
      const committed = data.events.filter(function (e) { return e.status === 'committed' }).sort(function (a, b) { return a.seq - b.seq })
      const candidates = data.events.filter(function (e) { return e.status === 'candidate' })
      return h('div', null,
        h('div', { style: { fontSize: 13, fontWeight: 700, color: ST.text, marginBottom: 6 } }, '主线事件链（' + committed.length + '）'),
        committed.length ? committed.map(function (e) {
          return h('div', { key: e.id, style: Object.assign({}, ST.card, { borderLeft: '3px solid ' + (TYPE_COLOR[e.type] || '#64748b') }) },
            h('div', { style: { display: 'flex', alignItems: 'center' } },
              h('span', { style: { fontSize: 11, color: ST.sub, marginRight: 6 } }, '#' + e.seq),
              h('span', { style: Object.assign({}, ST.badge, { background: TYPE_COLOR[e.type] || '#64748b', color: '#fff' }) }, e.type),
              h('span', { style: { fontSize: 12.5, fontWeight: 600, color: ST.text } }, e.title),
            ),
            h('div', { style: { fontSize: 11.5, color: '#374151', marginTop: 4, lineHeight: 1.55 } }, e.summary),
            (e.causes && e.causes.length) ? h('div', { style: { fontSize: 11, color: ST.sub, marginTop: 4 } }, '因：' + e.causes.map(function (c) { return evTitle(c) || c }).join(' → ')) : null,
            (e.participants && e.participants.length) ? h('div', { style: { fontSize: 11, color: ST.sub, marginTop: 2 } }, '参与：' + e.participants.join('、')) : null,
            e.stakes ? h('div', { style: { fontSize: 11, color: '#b45309', marginTop: 2 } }, '赌注：' + e.stakes) : null,
            e.check ? h('div', { style: { fontSize: 11, color: ST.sub, marginTop: 2 } }, '检定：' + e.check.verdict + '（' + e.check.certainty + '，' + (e.check.focus || '其他') + '）') : null,
          )
        }) : h('div', { style: { fontSize: 12, color: ST.sub, padding: 8 } }, '暂无事件，用 novel_plot_commit 或推演面板开始'),
        candidates.length ? h('div', { style: { marginTop: 14 } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: ST.warn, marginBottom: 6 } }, '待决分支（' + candidates.length + '）'),
          candidates.map(function (e) {
            return h('div', { key: e.id, style: Object.assign({}, ST.card, { border: '1px dashed #d97706', background: '#fffaf0' }) },
              h('div', { style: { fontSize: 12.5, fontWeight: 600, color: ST.text } }, e.title),
              h('div', { style: { fontSize: 11.5, color: '#374151', marginTop: 3, lineHeight: 1.55 } }, e.summary),
              h('div', { style: { marginTop: 6, display: 'flex', gap: 8 } },
                h('button', { style: ST.btnPrimary, onClick: function () { props.op('plot-decide', { eventId: e.id, accept: true }).catch(err) } }, '采纳'),
                h('button', { style: ST.btnDanger, onClick: function () { props.op('plot-decide', { eventId: e.id, accept: false }).catch(err) } }, '否决'),
              ),
            )
          }),
        ) : null,
      )
    }
    // ================= 伏笔簿 =================
    function SeedPanel(props) {
      const data = props.data
      const [seedEditing, setSeedEditing] = React.useState(null)
      const evTitle = function (id) {
        if (!id) return ''
        const ev = data.events.find(function (x) { return x.id === id })
        return ev ? (ev.type + '·' + ev.title) : ''
      }
      const seeds = data.seeds || []
      if (seedEditing) {
        return h('div', null,
          h(SeedFormView, {
            initial: seedEditing,
            evTitle: evTitle,
            onSave: function (seed) { return props.op('seed-save', { seed: seed }).then(function () { setSeedEditing(null) }) },
            onCancel: function () { setSeedEditing(null) },
            onRemove: function (id) { return props.op('seed-remove', { id: id }).then(function () { setSeedEditing(null) }) },
          }),
        )
      }
      return h('div', null,
        h('div', { style: { marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          h('span', { style: { fontSize: 13, fontWeight: 700, color: ST.text } }, '伏笔簿（' + seeds.length + '）'),
          h('button', { style: ST.btnPrimary, onClick: function () { setSeedEditing({ id: null, title: '', status: 'planted', horizon: '中', visibility: 'reader', intent: '', planted_at: '', payoff_at: '', related_settings: [], related_events: [] }) } }, '＋ 埋设伏笔'),
        ),
        seeds.length ? seeds.map(function (s) {
          return h('div', { key: s.id, style: ST.card },
            h('div', { style: { display: 'flex', alignItems: 'center' } },
              h('span', { style: Object.assign({}, ST.badge, { background: SEED_STATUS_COLOR[s.status] || '#9ca3af', color: '#fff' }) }, SEED_STATUS_LABEL[s.status] || s.status),
              h('span', { style: Object.assign({}, ST.badge, { background: '#f3f4f6', color: '#4b5563' }) }, (s.horizon || '中') + '回收'),
              h('span', { style: Object.assign({}, ST.badge, { background: s.visibility === 'hidden' ? '#f3e8ff' : '#ecfdf5', color: s.visibility === 'hidden' ? '#7c3aed' : '#047857' }) }, s.visibility === 'hidden' ? '暗线' : '明线'),
              h('span', { style: { fontSize: 12, fontWeight: 600, color: ST.text } }, s.title),
              h('button', {
                style: { marginLeft: 'auto', fontSize: 11, cursor: 'pointer', border: 'none', background: 'none', color: ST.sub, textDecoration: 'underline' },
                onClick: function () { setSeedEditing({ id: s.id, title: s.title, status: s.status, horizon: s.horizon, visibility: s.visibility, intent: s.intent || '', planted_at: s.planted_at || '', payoff_at: s.payoff_at || '', related_settings: s.related_settings || [], related_events: s.related_events || [] }) },
              }, '编辑'),
            ),
            s.intent ? h('div', { style: { fontSize: 11, color: ST.sub, marginTop: 3, lineHeight: 1.5 } }, '意图：' + s.intent) : null,
            (s.planted_at || s.payoff_at) ? h('div', { style: { fontSize: 11, color: ST.sub, marginTop: 2 } },
              (s.planted_at ? '埋设：' + (evTitle(s.planted_at) || s.planted_at) : '') + (s.payoff_at ? (s.planted_at ? ' ｜ ' : '') + '回收：' + (evTitle(s.payoff_at) || s.payoff_at) : '')) : null,
          )
        }) : h('div', { style: { fontSize: 12, color: ST.sub, padding: 8 } }, '暂无伏笔'),
      )
    }
    function SeedFormView(props) {
      const initial = props.initial
      const [title, setTitle] = React.useState(initial.title || '')
      const [status, setStatus] = React.useState(initial.status || 'planted')
      const [horizon, setHorizon] = React.useState(initial.horizon || '中')
      const [visibility, setVisibility] = React.useState(initial.visibility || 'reader')
      const [intent, setIntent] = React.useState(initial.intent || '')
      const [plantedAt, setPlantedAt] = React.useState(initial.planted_at || '')
      const [payoffAt, setPayoffAt] = React.useState(initial.payoff_at || '')
      const [error, setError] = React.useState('')
      const [saving, setSaving] = React.useState(false)
      const [confirmRemove, setConfirmRemove] = React.useState(false)
      const save = function () {
        if (!title.trim()) { setError('伏笔名称不能为空'); return }
        setSaving(true); setError('')
        props.onSave({
          id: initial.id || undefined,
          title: title.trim(),
          status: status,
          horizon: horizon,
          visibility: visibility,
          intent: intent.trim(),
          planted_at: plantedAt.trim(),
          payoff_at: payoffAt.trim(),
          related_settings: initial.related_settings || [],
          related_events: initial.related_events || [],
        }).then(function () {}, function (e) { setError(String((e && e.message) || e)); setSaving(false) })
      }
      const remove = function () {
        if (!confirmRemove) { setConfirmRemove(true); return }
        setSaving(true)
        props.onRemove(initial.id).then(function () {}, function (e) { setError(String((e && e.message) || e)); setSaving(false) })
      }
      return h('div', null,
        h('div', { style: { fontSize: 13, fontWeight: 700, color: ST.text, marginBottom: 4 } }, (initial.id ? '编辑伏笔' : '埋设新伏笔')),
        L({ text: '伏笔名称' }), I({ value: title, onChange: function (e) { setTitle(e.target.value) }, placeholder: '一句话伏笔' }),
        h('div', { style: { display: 'flex', gap: 8 } },
          h('div', { style: { flex: 1 } }, L({ text: '状态' }), SEL({ value: status, onChange: function (e) { setStatus(e.target.value) } }, Object.keys(SEED_STATUS_LABEL).map(function (k) { return h('option', { key: k, value: k }, SEED_STATUS_LABEL[k]) }))),
          h('div', { style: { flex: 1 } }, L({ text: '回收距离' }), SEL({ value: horizon, onChange: function (e) { setHorizon(e.target.value) } }, ['短', '中', '长', '超长'].map(function (k) { return h('option', { key: k, value: k }, k + '回收') }))),
          h('div', { style: { flex: 1 } }, L({ text: '明暗线' }), SEL({ value: visibility, onChange: function (e) { setVisibility(e.target.value) } }, h('option', { value: 'reader' }, '明线'), h('option', { value: 'hidden' }, '暗线'))),
        ),
        L({ text: '伏笔意图（为何埋设、何时回收、反转点）' }), TA({ value: intent, onChange: function (e) { setIntent(e.target.value) }, rows: 3, placeholder: '埋设于 X 事件；在 Y 事件反转……' }),
        h('div', { style: { display: 'flex', gap: 8 } },
          h('div', { style: { flex: 1 } }, L({ text: '埋设事件 id' }), I({ value: plantedAt, onChange: function (e) { setPlantedAt(e.target.value) }, placeholder: '如 e12' })),
          h('div', { style: { flex: 1 } }, L({ text: '回收事件 id' }), I({ value: payoffAt, onChange: function (e) { setPayoffAt(e.target.value) }, placeholder: '如 e20' })),
        ),
        props.evTitle(plantedAt) ? h('div', { style: { fontSize: 11, color: ST.ok, marginTop: 4 } }, '埋设事件：' + props.evTitle(plantedAt)) : null,
        props.evTitle(payoffAt) ? h('div', { style: { fontSize: 11, color: ST.ok, marginTop: 2 } }, '回收事件：' + props.evTitle(payoffAt)) : null,
        error ? h('div', { style: { color: ST.danger, fontSize: 12, marginTop: 6 } }, error) : null,
        h('div', { style: { marginTop: 10, display: 'flex', gap: 8 } },
          h('button', { style: ST.btnPrimary, onClick: save, disabled: saving }, saving ? '保存中…' : '保存'),
          h('button', { style: ST.btn, onClick: props.onCancel }, '取消'),
          initial.id ? h('button', { style: Object.assign({}, ST.btnDanger, { marginLeft: 'auto' }), onClick: remove }, confirmRemove ? '确认删除？' : '删除') : null,
        ),
      )
    }
    // ================= 推理与设定候选 =================
    function InferPanel(props) {
      const data = props.data
      const op = props.op
      const [query, setQuery] = React.useState('')
      const [domain, setDomain] = React.useState('all')
      const [msg, setMsg] = React.useState('')
      const [busy, setBusy] = React.useState(false)
      const pending = (data.candidates || []).filter(function (c) { return c.status === 'pending' })
      const runInfer = function () {
        setBusy(true)
        op('infer', { query: query.trim(), domain: domain }).then(function (r) {
          setMsg('推理完成：本轮生成设定候选 ' + (r.candidates || []).length + ' 条')
        }, function (e) { setMsg(String((e && e.message) || e)) }).then(function () { setBusy(false) })
      }
      const scan = function () {
        setBusy(true)
        op('setting-propose', {}).then(function (r) {
          setMsg('反向推导完成：新增候选 ' + (r.candidates || []).length + ' 条')
        }, function (e) { setMsg(String((e && e.message) || e)) }).then(function () { setBusy(false) })
      }
      const decide = function (c, accept) {
        op('candidate-decide', { id: c.id, accept: accept }).then(function (r) {
          setMsg((accept ? '已采纳 ' : '已忽略 ') + c.targetName + (r.resultId ? ' → ' + r.resultId : ''))
        }, function (e) { setMsg(String((e && e.message) || e)) })
      }
      return h('div', null,
        msg ? h('div', { style: { background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 6, padding: '6px 10px', marginBottom: 8, fontSize: 11.5, color: '#3730a3', whiteSpace: 'pre-wrap' } }, msg) : null,
        h('div', { style: { fontSize: 13, fontWeight: 700, color: ST.text, marginBottom: 6 } }, '推理引擎'),
        L({ text: '推理问题' }), I({ value: query, onChange: function (e) { setQuery(e.target.value) }, placeholder: '如 沈焰的燃石还有哪些隐患？（留空=扫描缺口）' }),
        L({ text: '推理范围' }),
        SEL({ value: domain, onChange: function (e) { setDomain(e.target.value) } },
          ['all', 'world', 'character', 'faction', 'power', 'location', 'item', 'timeline', 'plot'].map(function (d) { return h('option', { key: d, value: d }, d) })),
        h('div', { style: { marginTop: 8, display: 'flex', gap: 8 } },
          h('button', { style: ST.btnPrimary, onClick: runInfer, disabled: busy }, busy ? '推理中…' : '推理'),
          h('button', { style: ST.btn, onClick: scan, disabled: busy }, '反向推导候选'),
        ),
        h('div', { style: { fontSize: 11, color: ST.sub, marginTop: 6, lineHeight: 1.5 } },
          '推理语料会返回给 GM（对话侧）推理；本面板负责机械扫描缺口并生成设定候选——剧情推进到一定程度时反向补全世界观与人物。' ),
        h('div', { style: { marginTop: 14, fontSize: 13, fontWeight: 700, color: ST.text, marginBottom: 6 } }, '设定候选（' + pending.length + '）'),
        pending.length ? pending.map(function (c) {
          return h('div', { key: c.id, style: Object.assign({}, ST.card, { border: '1px dashed #7c5cd6', background: '#faf8ff' }) },
            h('div', { style: { display: 'flex', alignItems: 'center' } },
              h('span', { style: Object.assign({}, ST.badge, { background: CANDIDATE_KIND_COLOR[c.kind] || '#64748b', color: '#fff' }) }, c.kind),
              h('span', { style: { fontSize: 12.5, fontWeight: 600, color: ST.text } }, c.targetName),
              h('span', { style: { marginLeft: 'auto', fontSize: 11, color: ST.sub } }, c.id),
            ),
            h('div', { style: { fontSize: 11.5, color: '#374151', marginTop: 3, lineHeight: 1.5 } }, c.reason),
            c.evidence && c.evidence.length ? h('div', { style: { fontSize: 11, color: ST.sub, marginTop: 2 } }, '依据事件：' + c.evidence.join('、')) : null,
            h('div', { style: { marginTop: 6, display: 'flex', gap: 8 } },
              h('button', { style: ST.btnPrimary, onClick: function () { decide(c, true) } }, '采纳建卡'),
              h('button', { style: ST.btn, onClick: function () { decide(c, false) } }, '忽略'),
            ),
          )
        }) : h('div', { style: { fontSize: 12, color: ST.sub, padding: 8 } }, '暂无候选。用“推理/反向推导”扫描剧情隐含的缺口。'),
        (data.inferences || []).length ? h('div', { style: { marginTop: 12 } },
          h('div', { style: { fontSize: 12, fontWeight: 700, color: ST.text, marginBottom: 4 } }, '推理记录'),
          data.inferences.slice(-6).map(function (r) {
            return h('div', { key: r.id, style: { fontSize: 11, color: ST.sub, marginBottom: 3 } }, r.id + ' ' + r.query + '（' + r.domain + '，候选 ' + (r.gaps || 0) + '）')
          }),
        ) : null,
      )
    }
    // ================= 局势图 + 大纲（右栏） =================
    function LayoutPanel(props) {
      const layout = props.layout
      const data = props.data
      if (!layout) return h('div', { style: { fontSize: 12, color: ST.sub } }, '局势图加载中…')
      const entities = layout.entities || {}
      const conflicts = layout.conflicts || []
      const members = layout.factionMembers || {}
      const warnings = layout.warnings || []
      const nameOf = function (id) { const e = entities[id]; return e ? e.name : String(id) }
      const idList = Object.keys(entities)
      const factionIds = Object.keys(members).filter(function (fid) { return members[fid].length })
      return h('div', null,
        warnings.length ? h('div', { style: { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 10px', marginBottom: 8 } },
          warnings.map(function (w, i) { return h('div', { key: i, style: { fontSize: 11, color: ST.danger, lineHeight: 1.5 } }, '⚠ ' + w) }),
        ) : null,
        h('div', { style: { fontSize: 13, fontWeight: 700, color: ST.text, marginBottom: 6 } }, '当前状态（' + idList.length + '）'),
        idList.length ? idList.map(function (id) {
          const e = entities[id]
          const ks = Object.keys(e.state || {})
          return h('div', { key: id, style: ST.card },
            h('div', { style: { display: 'flex', alignItems: 'center' } },
              h('span', { style: Object.assign({}, ST.badge, { background: '#eef1fe', color: '#4f6ef7' }) }, TYPE_LABEL[e.type] || e.type),
              h('span', { style: { fontSize: 12, fontWeight: 600, color: ST.text } }, e.name),
            ),
            ks.length ? h('div', { style: { fontSize: 11, color: '#374151', marginTop: 3, lineHeight: 1.6 } },
              ks.map(function (k) { return h('span', { key: k, style: { marginRight: 8, whiteSpace: 'nowrap' } }, k + '：' + e.state[k]) }))
              : h('div', { style: { fontSize: 11, color: ST.sub, marginTop: 3 } }, '（无状态字段）'),
          )
        }) : h('div', { style: { fontSize: 12, color: ST.sub, padding: 8 } }, '暂无设定'),
        conflicts.length ? h('div', { style: { marginTop: 12 } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: ST.text, marginBottom: 6 } }, '冲突网（' + conflicts.length + '）'),
          conflicts.map(function (c, i) {
            return h('div', { key: i, style: Object.assign({}, ST.card, { display: 'flex', alignItems: 'center' }) },
              h('span', { style: { fontSize: 12, fontWeight: 600, color: ST.danger } }, nameOf(c.pair[0]) + ' ⚔ ' + nameOf(c.pair[1])),
              h('span', { style: { marginLeft: 'auto', fontSize: 11, color: ST.sub } }, '×' + c.count),
            )
          }),
        ) : null,
        factionIds.length ? h('div', { style: { marginTop: 12 } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: ST.text, marginBottom: 6 } }, '势力归属'),
          factionIds.map(function (fid) {
            return h('div', { key: fid, style: { fontSize: 11.5, color: '#374151', marginBottom: 3, lineHeight: 1.5 } },
              h('span', { style: { fontWeight: 600, color: ST.text } }, nameOf(fid) + '：'),
              members[fid].map(function (m) { return nameOf(m) }).join('、'),
            )
          }),
        ) : null,
        h('div', { style: { marginTop: 12 } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: ST.text, marginBottom: 6 } }, '分卷大纲'),
          data.arcs.length ? data.arcs.map(function (a) {
            return h('div', { key: a.id, style: ST.card },
              h('div', { style: { fontSize: 12.5, fontWeight: 700, color: ST.text } }, a.title + (a.chapters.length ? '（' + a.chapters.length + '章）' : '')),
              a.purpose ? h('div', { style: { fontSize: 11, color: ST.sub, marginTop: 2, lineHeight: 1.5 } }, a.purpose) : null,
              a.chapters.map(function (ch) {
                return h('div', { key: ch.id, style: { marginTop: 6, paddingLeft: 8, borderLeft: '2px solid ' + ST.line } },
                  h('div', { style: { fontSize: 12, fontWeight: 600, color: '#374151' } }, '第' + ch.index + '章 ' + ch.title),
                  ch.goal ? h('div', { style: { fontSize: 11, color: ST.sub, marginTop: 1 } }, '目标：' + ch.goal) : null,
                  ch.conflict ? h('div', { style: { fontSize: 11, color: ST.sub } }, '冲突：' + ch.conflict) : null,
                  ch.hook ? h('div', { style: { fontSize: 11, color: '#7c5cd6' } }, '钩子：' + ch.hook) : null,
                )
              }),
            )
          }) : h('div', { style: { fontSize: 12, color: ST.sub, padding: 8 } }, '暂无大纲，用 novel_outline_build 生成'),
        ),
      )
    }
    // ================= 助手流式输出悬浮窗 =================
    function StreamFloat(props) {
      const useSession = props.useSession || function () { return { partial: null, running: false, calls: [] } }
      const snap = useSession(function (s) { return { partial: s.partial, running: s.running, calls: s.runningCalls } }) || { partial: null, running: false, calls: [] }
      const [open, setOpen] = React.useState(true)
      const [pos, setPos] = React.useState(null)
      const bodyRef = React.useRef(null)
      const lastRef = React.useRef('')
      const lastTurnRef = React.useRef(null)
      const dragRef = React.useRef(null)
      React.useEffect(function () {
        if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
      }, [snap])
      const blocks = (snap.partial && snap.partial.blocks) || []
      const lines = []
      blocks.forEach(function (b) {
        if (b.kind === 'text') lines.push(b.text)
        else if (b.kind === 'reasoning') lines.push('🤔 ' + b.text)
      })
      const curText = lines.join('\n')
      // 保留最近一轮输出：生成中累积到 lastRef；新一轮（turn 变化）清空重来；空闲时显示缓存
      if (snap.partial) {
        if (lastTurnRef.current !== snap.partial.turn) {
          lastTurnRef.current = snap.partial.turn
          lastRef.current = ''
        }
        lastRef.current = curText
      }
      const text = snap.partial ? curText : (snap.running ? '' : lastRef.current)
      const toolName = (snap.calls && snap.calls.length) ? snap.calls[0].name : ''
      const dotColor = snap.running ? '#4f6ef7' : (lastRef.current ? '#2e9e5b' : '#9ca3af')
      let status = '待命'
      if (snap.running) status = toolName ? '调用工具 ' + toolName : (snap.partial ? '生成中…' : '思考中…')
      else if (lastRef.current) status = '已完成（保留）'
      // 拖拽：标题栏按下记录起点，移动超过阈值视为拖动；点击与拖动分离
      const onHeaderDown = function (e) {
        const startX = e.clientX, startY = e.clientY
        const base = pos || { x: null, y: null, anchor: 'rb' }
        const rect = e.currentTarget.getBoundingClientRect()
        dragRef.current = {
          startX: startX, startY: startY, dragged: false,
          // 未拖过时按右下角锚定换算成 left/top
          left: base.left !== undefined ? base.left : (window.innerWidth - rect.width - 16),
          top: base.top !== undefined ? base.top : (window.innerHeight - rect.height - 16),
        }
        const onMove = function (ev) {
          const d = dragRef.current
          if (!d) return
          const dx = ev.clientX - d.startX, dy = ev.clientY - d.startY
          if (!d.dragged && Math.abs(dx) + Math.abs(dy) > 4) d.dragged = true
          if (d.dragged) {
            const w = 340
            const h = open ? 250 : 32
            const x = Math.min(Math.max(d.left + dx, 0), window.innerWidth - w)
            const y = Math.min(Math.max(d.top + dy, 0), window.innerHeight - h)
            setPos({ left: x, top: y })
          }
        }
        const onUp = function () {
          window.removeEventListener('pointermove', onMove)
          window.removeEventListener('pointerup', onUp)
          dragRef.current = null
        }
        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
      }
      const onHeaderClick = function () {
        if (dragRef.current && dragRef.current.dragged) return
        setOpen(!open)
      }
      const floatStyle = { position: 'fixed', zIndex: 999, width: 340, background: 'rgba(255,255,255,0.97)', border: '1px solid #e3e6ea', borderRadius: 10, boxShadow: '0 6px 24px rgba(31,35,41,0.16)', overflow: 'hidden', fontFamily: 'inherit' }
      if (pos) { floatStyle.left = pos.left; floatStyle.top = pos.top } else { floatStyle.right = 16; floatStyle.bottom = 16 }
      return h('div', { style: floatStyle },
        h('div', {
          style: { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: '#f6f7f9', borderBottom: '1px solid #e3e6ea', cursor: 'grab', userSelect: 'none', touchAction: 'none' },
          onPointerDown: onHeaderDown,
          onClick: onHeaderClick,
        },
          h('span', { style: { width: 8, height: 8, borderRadius: 4, background: dotColor, flex: '0 0 auto' } }),
          h('span', { style: { fontSize: 12, fontWeight: 700, color: '#1f2329' } }, '助手输出'),
          h('span', { style: { fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, status),
          h('span', { style: { marginLeft: 'auto', fontSize: 12, color: '#6b7280' } }, open ? '▾' : '▸'),
        ),
        open ? h('div', {
          ref: bodyRef,
          style: { maxHeight: 200, overflowY: 'auto', padding: '8px 10px', fontSize: 12, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
        },
          text ? h('span', null, text, snap.running ? h('span', { style: { color: '#4f6ef7' } }, '▍') : null)
            : h('span', { style: { color: '#9ca3af' } }, snap.running ? '思考中…' : '暂无输出（对话中生成的内容会实时显示在这里，且保留最近一轮）'),
        ) : null,
      )
    }
    // ================= 项目管理（v11 多项目） =================
    function ProjectNewForm(props) {
      const [title, setTitle] = React.useState('')
      const [premise, setPremise] = React.useState('')
      const [genre, setGenre] = React.useState('')
      const [tone, setTone] = React.useState('')
      const [targetLength, setTargetLength] = React.useState('')
      const [saving, setSaving] = React.useState(false)
      const [msg, setMsg] = React.useState('')
      const save = function () {
        if (!title.trim() || !premise.trim()) { setMsg('标题与核心构思必填'); return }
        setSaving(true)
        props.op('project-new', { title: title.trim(), premise: premise.trim(), genre: genre.trim(), tone: tone.trim(), target_length: targetLength.trim() })
          .then(function () { props.onDone() }, function (e) { setSaving(false); setMsg(String((e && e.message) || e)) })
      }
      return h('div', null,
        h('div', { style: { fontSize: 13, fontWeight: 700, color: ST.text, marginBottom: 4 } }, '新建小说项目'),
        L({ text: '作品名' }), I({ value: title, onChange: function (e) { setTitle(e.target.value) }, placeholder: '如 燃石记' }),
        L({ text: '一句话核心构思' }), TA({ value: premise, onChange: function (e) { setPremise(e.target.value) }, rows: 3, placeholder: '主角、核心冲突、世界基调（结构化描述，非文学段落）' }),
        h('div', { style: { display: 'flex', gap: 8 } },
          h('div', { style: { flex: 1 } }, L({ text: '题材' }), I({ value: genre, onChange: function (e) { setGenre(e.target.value) }, placeholder: '玄幻/科幻/悬疑…' })),
          h('div', { style: { flex: 1 } }, L({ text: '基调' }), I({ value: tone, onChange: function (e) { setTone(e.target.value) }, placeholder: '热血/冷峻/诙谐' })),
          h('div', { style: { flex: 1 } }, L({ text: '目标篇幅' }), I({ value: targetLength, onChange: function (e) { setTargetLength(e.target.value) }, placeholder: '200万字' })),
        ),
        msg ? h('div', { style: { color: ST.danger, fontSize: 12, marginTop: 6 } }, msg) : null,
        h('div', { style: { marginTop: 10, display: 'flex', gap: 8 } },
          h('button', { style: ST.btnPrimary, onClick: save, disabled: saving }, saving ? '创建中…' : '创建并切换'),
          h('button', { style: ST.btn, onClick: props.onBack }, '取消'),
        ),
        h('div', { style: { fontSize: 11, color: ST.sub, marginTop: 8, lineHeight: 1.5 } }, '创建后自动切换到新项目；原项目数据保留在项目索引中，可随时切回。' ),
      )
    }
    function ProjectImportForm(props) {
      const [text, setText] = React.useState('')
      const [file, setFile] = React.useState('')
      const [title, setTitle] = React.useState('')
      const [saving, setSaving] = React.useState(false)
      const [msg, setMsg] = React.useState('')
      const save = function () {
        if (!text.trim() && !file.trim()) { setMsg('请粘贴 JSON 内容或填写文件路径（二选一）'); return }
        const payload = {}
        if (text.trim()) payload.json = text.trim()
        if (file.trim()) payload.file = file.trim()
        if (title.trim()) payload.title = title.trim()
        setSaving(true)
        props.op('project-import', payload)
          .then(function () { props.onDone() }, function (e) { setSaving(false); setMsg(String((e && e.message) || e)) })
      }
      return h('div', null,
        h('div', { style: { fontSize: 13, fontWeight: 700, color: ST.text, marginBottom: 4 } }, '导入小说项目'),
        L({ text: '方式一：粘贴 state.json 完整内容' }),
        TA({ value: text, onChange: function (e) { setText(e.target.value) }, rows: 6, placeholder: '{ "meta": { "title": "...", ... }, ... }' }),
        L({ text: '方式二：填写本机文件绝对路径（与方式一互斥）' }), I({ value: file, onChange: function (e) { setFile(e.target.value) }, placeholder: 'D:\\backup\\my-novel\\state.json' }),
        L({ text: '导入后的项目名（可选，缺省用文件内标题）' }), I({ value: title, onChange: function (e) { setTitle(e.target.value) } }),
        msg ? h('div', { style: { color: ST.danger, fontSize: 12, marginTop: 6 } }, msg) : null,
        h('div', { style: { marginTop: 10, display: 'flex', gap: 8 } },
          h('button', { style: ST.btnPrimary, onClick: save, disabled: saving }, saving ? '导入中…' : '导入并切换'),
          h('button', { style: ST.btn, onClick: props.onBack }, '取消'),
        ),
        h('div', { style: { fontSize: 11, color: ST.sub, marginTop: 8, lineHeight: 1.5 } }, '导入校验 meta 字段；数据落盘为独立项目（projects/<id>/state.json），不覆盖任何现有项目。' ),
      )
    }
    // ================= 主组件：三栏工作台 =================
    function Workbench(props) {
      const wb = useWorkbench()
      const { data, layout, err, refresh, ping, op, busy } = wb
      const [tab, setTab] = React.useState('scene')
      const [leftOpen, setLeftOpen] = React.useState(false)
      const [rightOpen, setRightOpen] = React.useState(false)
      const [projView, setProjView] = React.useState('')
      let content = null
      if (!data) {
        content = h('div', { style: { fontSize: 12, color: ST.danger, padding: 20 } }, err ? '加载失败：' + err : '加载中…')
      } else if (projView === 'new') {
        content = h('div', { style: { padding: '4px 2px' } },
          h(ProjectNewForm, { op: op, onDone: function () { setProjView('') }, onBack: function () { setProjView('') } }))
      } else if (projView === 'import') {
        content = h('div', { style: { padding: '4px 2px' } },
          h(ProjectImportForm, { op: op, onDone: function () { setProjView('') }, onBack: function () { setProjView('') } }))
      } else {
        const tabs = [
          { key: 'scene', label: '推演', count: data.session && data.session.activeSceneId ? 1 : 0 },
          { key: 'plot', label: '事件链', count: data.events.filter(function (e) { return e.status === 'candidate' }).length },
          { key: 'seed', label: '伏笔', count: data.seeds.length },
          { key: 'infer', label: '推理', count: (data.candidates || []).filter(function (c) { return c.status === 'pending' }).length },
        ]
        const middle = h('div', null,
          h('div', { style: { display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' } },
            tabs.map(function (t) {
              return h('button', { key: t.key, style: tab === t.key ? ST.chipOn : ST.chip, onClick: function () { setTab(t.key) } },
                t.label, t.count ? h('span', { style: { marginLeft: 4, opacity: 0.65 } }, t.count) : null)
            }),
          ),
          tab === 'scene' ? h(ScenePanel, { data: data, op: op })
            : tab === 'plot' ? h(PlotPanel, { data: data, op: op })
            : tab === 'seed' ? h(SeedPanel, { data: data, op: op })
            : h(InferPanel, { data: data, op: op }),
        )
        const leftPane = leftOpen
          ? h('div', { style: { flex: '0 0 260px', borderRight: '1px solid ' + ST.line, background: ST.colBg, display: 'flex', flexDirection: 'column', maxHeight: '72vh' } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px 0 14px' } },
              h('span', { style: { fontSize: 12, fontWeight: 700, color: ST.sub } }, '设定管理'),
              h('button', { style: Object.assign({}, ST.btn, { padding: '2px 8px' }), onClick: function () { setLeftOpen(false) }, title: '收起设定管理' }, '◀ 收起'),
            ),
            h('div', { style: { flex: 1, overflowY: 'auto', padding: '8px 14px 12px' } },
              h(SettingPanel, { data: data, refresh: refresh, op: op })),
          )
          : h('div', {
              style: { flex: '0 0 26px', borderRight: '1px solid ' + ST.line, background: ST.colBg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', maxHeight: '72vh' },
              onClick: function () { setLeftOpen(true) }, title: '展开设定管理',
            },
            h('span', { style: { writingMode: 'vertical-rl', fontSize: 12, color: ST.sub, fontWeight: 600 } }, '⏵ 设定管理'),
          )
        const rightPane = rightOpen
          ? h('div', { style: { flex: '0 0 300px', borderLeft: '1px solid ' + ST.line, background: ST.colBg, display: 'flex', flexDirection: 'column', maxHeight: '72vh' } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px 0 10px' } },
              h('span', { style: { fontSize: 12, fontWeight: 700, color: ST.sub } }, '局势图 / 大纲'),
              h('button', { style: Object.assign({}, ST.btn, { padding: '2px 8px' }), onClick: function () { setRightOpen(false) }, title: '收起局势图' }, '收起 ▶'),
            ),
            h('div', { style: { flex: 1, overflowY: 'auto', padding: '8px 14px 12px' } },
              h(LayoutPanel, { layout: layout, data: data })),
          )
          : h('div', {
              style: { flex: '0 0 26px', borderLeft: '1px solid ' + ST.line, background: ST.colBg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', maxHeight: '72vh' },
              onClick: function () { setRightOpen(true) }, title: '展开局势图',
            },
            h('span', { style: { writingMode: 'vertical-rl', fontSize: 12, color: ST.sub, fontWeight: 600 } }, '局势图 ▶'),
          )
        content = h('div', { style: { display: 'flex', alignItems: 'stretch', minHeight: 460 } },
          leftPane,
          h('div', { style: { flex: '1 1 auto', minWidth: 0, padding: '12px 14px', maxHeight: '72vh', overflowY: 'auto' } },
            middle),
          rightPane,
        )
      }
      const openScenes = data ? data.scenes.filter(function (s) { return s.status === 'open' }).length : 0
      const pendingC = data ? (data.candidates || []).filter(function (c) { return c.status === 'pending' }).length : 0
      const header = h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' } },
        h('span', { style: { fontSize: 16, fontWeight: 700, color: ST.text } }, '小说推演台'),
        data && (data.projects || []).length ? h('select', {
          value: (data.project && data.project.id) || '',
          onChange: function (e) {
            const id = e.target.value
            if (id && id !== (data.project && data.project.id)) {
              op('project-switch', { id: id }).catch(function (x) { console.error('[novel-assistant] switch 失败:', x) })
            }
          },
          style: { width: 'auto', maxWidth: 200, boxSizing: 'border-box', padding: '3px 8px', borderRadius: 6, border: '1px solid #d0d5dd', fontSize: 12, background: '#fff', color: '#1f2329', cursor: 'pointer' },
          title: '切换项目',
        },
          (data.projects || []).map(function (p) {
            return h('option', { key: p.id, value: p.id }, '《' + p.title + '》' + (p.genre ? '（' + p.genre + '）' : ''))
          })) : null,
        data ? h('button', { style: Object.assign({}, ST.btn, { padding: '3px 10px', fontSize: 12 }), onClick: function () { setProjView('new') }, title: '新建独立项目' }, '＋ 新建') : null,
        data ? h('button', { style: Object.assign({}, ST.btn, { padding: '3px 10px', fontSize: 12 }), onClick: function () { setProjView('import') }, title: '导入项目（JSON 或文件）' }, '导入') : null,
        data && data.meta.title ? h('span', { style: { fontSize: 12, color: ST.sub, fontWeight: 600 } }, '《' + data.meta.title + '》') : null,
        data ? h('span', { style: { fontSize: 11, color: ST.sub } },
          '设定 ' + data.settings.length + ' ｜ 事件 ' + data.events.length + '（主线 ' + data.events.filter(function (e) { return e.status === 'committed' }).length + '）｜ 伏笔 ' + (data.seeds || []).length + ' ｜ 卷 ' + data.arcs.length +
          (openScenes ? ' ｜ 场景 ' + openScenes : '') + (pendingC ? ' ｜ 候选 ' + pendingC : '')) : null,
        h('span', { style: { marginLeft: 'auto', fontSize: 11, color: ping.indexOf('正常') >= 0 ? ST.ok : ST.danger } }, ping),
        h('button', { style: ST.btn, onClick: refresh, disabled: busy }, busy ? '同步中…' : '刷新'),
      )
      return h('div', { style: { padding: '14px 18px', fontFamily: 'inherit', background: '#fff', color: ST.text } },
        header,
        content,
        h(StreamFloat, { useSession: props.useSession }),
      )
    }
    console.log('[novel-assistant] 注册 conversation.view')
    ctx.effect(() => slots.inject('conversation.view', function () {
      return slots.register({ name: 'conversation.view', id: 'novel-workbench', order: 20, label: '推演台' },
        function (props) { return React.createElement(Workbench, props) },
      )
    }), 'novel-workbench: panel')
    console.log('[novel-assistant] client v10 注册完成')
  },
}

})()
export default __mirror
