// ============================================
// src/i18n/zh.ts
// 中文（简体）— 完整词典 v1
// ============================================

import type { Dict } from "../contexts/LangContext";

export const zh: Dict = {
  // -----------------------------
  // 导航 / 标签
  // -----------------------------
  "nav.home": "首页",
  "nav.local": "本地",
  "nav.games": "游戏",
  "nav.training": "训练",
  "nav.online": "在线",
  "nav.stats": "统计",
  "nav.settings": "设置",
  "nav.profiles": "个人档案",
  "nav.sync": "同步与分享",
  "nav.back": "返回",
  "nav.close": "关闭",

  // -----------------------------
  // 通用
  // -----------------------------
  "common.ok": "确定",
  "common.cancel": "取消",
  "common.yes": "是",
  "common.no": "否",
  "common.save": "保存",
  "common.edit": "编辑",
  "common.delete": "删除",
  "common.confirm": "确认",
  "common.next": "下一步",
  "common.prev": "上一步",
  "common.start": "开始",
  "common.continue": "继续",
  "common.resume": "继续",
  "common.pause": "暂停",
  "common.reset": "重置",
  "common.shuffle": "随机",
  "common.loading": "加载中…",
  "common.error": "发生错误",
  "common.info": "信息",
  "common.stats": "统计",
  "common.history": "历史记录",
  "common.tutorial": "教程",
  "common.exit": "退出",
  "common.backHome": "返回首页",
  "common.player": "玩家",
  "common.players": "玩家",
  "common.team": "队伍",
  "common.teams": "队伍",
  "common.points": "分数",
  "common.average": "平均值",
  "common.best": "最佳",
  "common.worst": "最差",
  "common.total": "总计",
  "common.date": "日期",
  "common.time": "时间",

  // -----------------------------
  // 首页 / Dashboard
  // -----------------------------
  "home.title": "控制面板",
  "home.subtitle": "Darts Counter 控制中心",

  "status.online": "在线",
  "status.away": "离开",
  "status.offline": "离线",

  "home.welcome": "欢迎",
  "home.welcome.noProfile": "欢迎使用 Darts Counter",
  "home.hero.tagline": "准备好投掷飞镖了吗？",

  // 活跃个人档案
  "home.activeProfile.title": "当前档案",
  "home.activeProfile.none": "未选择档案",
  "home.activeProfile.select": "选择档案",
  "home.activeProfile.manage": "管理档案",
  "home.activeProfile.status.online": "在线",
  "home.activeProfile.status.offline": "离线",
  "home.activeProfile.status.guest": "访客",
  "home.activeProfile.badge.you": "你",
  "home.activeProfile.badge.local": "本地",
  "home.activeProfile.badge.online": "在线",

  // 档案快速统计
  "home.activeProfile.stats.title": "快速统计",
  "home.activeProfile.stats.x01Avg": "X01 平均",
  "home.activeProfile.stats.cricketMpr": "Cricket MPR",
  "home.activeProfile.stats.trainingVolume": "训练量",
  "home.activeProfile.stats.lastGame": "上次比赛",
  "home.activeProfile.stats.noGames": "暂无比赛",
  "home.activeProfile.stats.seeAll": "查看全部统计",

  // 快速操作
  "home.quickActions.title": "快捷操作",
  "home.quickActions.playX01": "开始 X01",
  "home.quickActions.playCricket": "开始 Cricket",
  "home.quickActions.training": "进入训练",
  "home.quickActions.stats": "查看统计",

  // stats 轮播
  "home.statsCarousel.title": "快速统计",
  "home.statsCarousel.x01": "X01",
  "home.statsCarousel.cricket": "Cricket",
  "home.statsCarousel.training": "训练",

  // ArcadeTicker / 信息栏
  "home.arcadeBanner.title": "资讯与更新",
  "home.arcadeBanner.tapForMore": "点击查看更多",
  "home.arcadeBanner.empty": "暂时没有信息",
  "home.arcadeBanner.tag.new": "新",
  "home.arcadeBanner.tag.tip": "技巧",
  "home.arcadeBanner.tag.update": "更新",

  // 导航大按钮
  "home.nav.profiles": "档案",
  "home.nav.profiles.desc": "本地档案、头像与机器人",
  "home.nav.local": "本地游戏",
  "home.nav.local.desc": "在此靶盘上游戏",
  "home.nav.online": "在线",
  "home.nav.online.desc": "与朋友远程对战",
  "home.nav.training": "训练",
  "home.nav.training.desc": "深入的训练模式",
  "home.nav.stats": "统计",
  "home.nav.stats.desc": "仪表板、图表与历史",
  "home.nav.settings": "设置",
  "home.nav.settings.desc": "主题、语言与高级选项",

  // 信息栏 / Ticker
  "home.ticker.records": "最新纪录",
  "home.ticker.records.text":
    "你最近打破了多个纪录，继续保持！",

  "home.ticker.localLast": "最近本地比赛",
  "home.ticker.localLast.text": "你最近一次本地比赛的摘要。",

  "home.ticker.onlineLast": "最近在线比赛",
  "home.ticker.onlineLast.text": "准备好为你的上一场在线比赛复仇了吗？",

  "home.ticker.onlineLeader": "排行榜领先者",
  "home.ticker.onlineLeader.text": "看看谁目前位于在线排行榜首位。",

  "home.ticker.training": "当前训练",
  "home.ticker.training.text":
    "X01 与“时钟训练”的训练总量。",

  "home.ticker.month": "本月统计",
  "home.ticker.month.text": "本月总比赛数与命中数。",

  "home.ticker.tip": "今日技巧",
  "home.ticker.tip.text": "定期练习你最喜欢的收尾方式。",

  // -----------------------------
  // GAMES / 游戏
  // -----------------------------
  "games.title": "全部游戏",
  "games.subtitle": "选择游戏模式",
  "games.section.classic": "经典模式",
  "games.section.training": "训练",
  "games.section.party": "娱乐派对",
  "games.section.other": "其他模式",

  "games.x01.title": "X01",
  "games.x01.desc": "301 / 501 / 701… 精准收至 0。",

  "games.cricket.title": "Cricket",
  "games.cricket.desc": "15 到 20 + Bull，打开/关闭并得分。",

  "games.killer.title": "Killer",
  "games.killer.desc": "成为刺客并淘汰其他玩家。",

  "games.shanghai.title": "上海",
  "games.shanghai.desc": "每回合一个数字，命中 S / D / T。",

  "games.training.menuTitle": "训练",
  "games.training.x01Solo": "X01 单人训练",
  "games.training.clock": "时钟训练",
  "games.training.custom": "自定义训练",
  "games.training.evolution": "成长统计",

  "games.info.title": "游戏信息",
  "games.info.rules": "规则",
  "games.info.tips": "技巧",

  // -----------------------------
  // 个人档案
  // -----------------------------
  "profiles.title": "本地档案",
  "profiles.subtitle": "管理你的本地玩家",
  "profiles.add": "新增档案",
  "profiles.edit": "编辑档案",
  "profiles.delete": "删除档案",
  "profiles.confirmDelete": "确认永久删除该档案？",
  "profiles.name.label": "玩家名称",
  "profiles.name.placeholder": "输入昵称",
  "profiles.avatar.label": "头像",
  "profiles.avatar.random": "随机头像",
  "profiles.stats.title": "档案统计",
  "profiles.stats.x01": "X01 统计",
  "profiles.stats.cricket": "Cricket 统计",
  "profiles.stats.training": "训练统计",
  "profiles.status.active": "活跃",
  "profiles.status.inactive": "非活跃",
  "profiles.selectActive": "设为当前档案",
  "profiles.list.empty": "目前没有档案",
  "profiles.list.selectHint": "点击档案进行选择",
  "profiles.hint.avatarTap": "点击头像更换图像",

  // -----------------------------
  // Avatar Creator / 头像生成器
  // -----------------------------
  "avatar.title": "头像生成器",
  "avatar.subtitle": "自定义你的徽章",
  "avatar.style.label": "风格",
  "avatar.style.realistic": "轻写实",
  "avatar.style.comic": "漫画风",
  "avatar.style.flat": "扁平风格",
  "avatar.style.exaggerated": "夸张风",
  "avatar.theme.label": "主题",
  "avatar.preview.label": "预览",
  "avatar.generate": "生成新头像",
  "avatar.keep": "保留此头像",
  "avatar.cancel": "取消修改",

  // -----------------------------
  // X01 CONFIG
  // -----------------------------
  "x01.config.title": "X01 设置",
  "x01.config.subtitle": "准备你的比赛",
  "x01.config.section.players": "玩家",
  "x01.config.section.match": "比赛格式",
  "x01.config.section.rules": "基础设置",
  "x01.config.players.add": "添加玩家",
  "x01.config.players.remove": "移除",
  "x01.config.players.teams": "队伍",
  "x01.config.mode.label": "游戏模式",
  "x01.config.mode.solo": "单人",
  "x01.config.mode.multi": "多人",
  "x01.config.mode.teams": "团队",
  "x01.config.raceToSets.label": "先赢的套数",
  "x01.config.raceToLegs.label": "先赢的局数",
  "x01.config.startingScore.label": "初始分数",
  "x01.config.startingScore.301": "301",
  "x01.config.startingScore.501": "501",
  "x01.config.startingScore.701": "701",
  "x01.config.startingScore.custom": "自定义",
  "x01.config.in.label": "In",
  "x01.config.out.label": "Out",
  "x01.config.in.simple": "Single In",
  "x01.config.in.double": "Double In",
  "x01.config.in.master": "Master In",
  "x01.config.out.simple": "Single Out",
  "x01.config.out.double": "Double Out",
  "x01.config.out.master": "Master Out",
  "x01.config.service.label": "发球",
  "x01.config.service.random": "随机",
  "x01.config.service.alternate": "轮流",
  "x01.config.bots.title": "机器人 (AI)",
  "x01.config.bots.add": "添加机器人",
  "x01.config.bots.level.easy": "简单",
  "x01.config.bots.level.medium": "中等",
  "x01.config.bots.level.hard": "困难",
  "x01.config.bots.level.pro": "职业",
  "x01.config.startMatch": "开始比赛",
  "x01.config.back": "返回游戏",

  // -----------------------------
  // X01 PLAY
  // -----------------------------
  "x01.play.title": "X01",
  "x01.play.leg": "局",
  "x01.play.set": "套",
  "x01.play.currentPlayer": "当前玩家",
  "x01.play.scoreRemaining": "剩余",
  "x01.play.lastVisit": "上次记录",
  "x01.play.average3": "平均值 / 3 镖",
  "x01.play.bestVisit": "最佳回合",
  "x01.play.checkout": "Checkout",
  "x01.play.dartsThrown": "投掷次数",
  "x01.play.visits": "回合",
  "x01.play.bust": "Bust",
  "x01.play.undo": "撤销回合",
  "x01.play.confirmExit": "确定退出当前比赛？",
  "x01.play.botThinking": "AI 思考中…",
  "x01.play.noScoreYet": "暂无得分",
  "x01.play.matchOver": "比赛结束",
  "x01.play.legOver": "本局结束",
  "x01.play.setOver": "本套结束",
  "x01.play.nextLeg": "下一局",
  "x01.play.nextSet": "下一套",
  "x01.play.backToConfig": "返回设置",
  "x01.play.saveInHistory": "保存到历史记录",

  // -----------------------------
  // CRICKET
  // -----------------------------
  "cricket.config.title": "Cricket 设置",
  "cricket.config.players": "玩家",
  "cricket.config.raceTo.label": "分数或局数",
  "cricket.config.pointsWin": "按分数胜出",
  "cricket.config.legsWin": "按局数胜出",
  "cricket.play.title": "Cricket",
  "cricket.play.targets": "目标",
  "cricket.play.hits": "命中",
  "cricket.play.score": "得分",
  "cricket.play.marksPerRound": "MPR",
  "cricket.play.currentPlayer": "当前玩家",
  "cricket.play.open": "开",
  "cricket.play.closed": "关",
  "cricket.stats.title": "Cricket 统计",
  "cricket.stats.profile": "Cricket 档案",
  "cricket.stats.bestMpr": "最佳 MPR",
  "cricket.stats.averageMpr": "平均 MPR",
  "cricket.stats.gamesPlayed": "比赛场数",
  "cricket.stats.gamesWon": "胜利场数",

  // -----------------------------
  // TRAINING MENU / 训练菜单
  // -----------------------------
  "training.menu.title": "训练",
  "training.menu.subtitle": "强化你的强项",
  "training.menu.x01Solo": "X01 单人训练",
  "training.menu.x01Solo.desc": "详细记录每一次投掷。",
  "training.menu.clock": "时钟训练",
  "training.menu.clock.desc": "按顺序命中所有数字。",
  "training.menu.evolution": "成长曲线",
  "training.menu.evolution.desc": "查看你的长期进步。",
  "training.menu.custom": "自定义训练",
  "training.menu.resumeLast": "继续上次训练",
  "training.menu.noSession": "暂无训练记录",

  // -----------------------------
  // TRAINING X01
  // -----------------------------
  "training.x01.title": "X01 单人训练",
  "training.x01.subtitle": "每一镖的详细分析",
  "training.x01.targetScore.label": "起始分数",
  "training.x01.throws": "投掷次数",
  "training.x01.hitsBySegment": "按分区统计",
  "training.x01.hits.single": "单倍",
  "training.x01.hits.double": "双倍",
  "training.x01.hits.triple": "三倍",
  "training.x01.hits.bull": "Bull",
  "training.x01.hits.dBull": "Double Bull",
  "training.x01.busts": "Bust",
  "training.x01.avgPerDart": "平均 / 镖",
  "training.x01.session.save": "保存训练",
  "training.x01.session.saved": "训练已保存",
  "training.x01.session.delete": "删除训练",
  "training.x01.session.confirmDelete": "确定删除该训练？",

  // -----------------------------
  // TRAINING CLOCK
  // -----------------------------
  "training.clock.title": "时钟训练",
  "training.clock.subtitle": "按顺序命中每个数字",
  "training.clock.objective.label": "目标",
  "training.clock.objective.allSingles": "全部单倍",
  "training.clock.objective.allDoubles": "全部双倍",
  "training.clock.objective.allTriples": "全部三倍",
  "training.clock.objective.custom": "自定义路线",
  "training.clock.timer.label": "计时器",
  "training.clock.timer.off": "无计时",
  "training.clock.timer.30": "30 秒",
  "training.clock.timer.60": "60 秒",
  "training.clock.timer.120": "120 秒",
  "training.clock.players": "玩家",
  "training.clock.start": "开始训练",
  "training.clock.currentTarget": "当前目标",
  "training.clock.progress": "进度",
  "training.clock.session.save": "保存训练",
  "training.clock.session.saved": "训练已保存",

  // -----------------------------
  // STATSHUB / 统计中心
  // -----------------------------
  "stats.shell.title": "统计中心",
  "stats.shell.tabs.local": "本地档案",
  "stats.shell.tabs.training": "训练",
  "stats.shell.tabs.online": "在线",
  "stats.shell.tabs.history": "历史记录",
  "stats.shell.info": "请选择一个统计板块。",
  "stats.hub.local.title": "本地档案统计",
  "stats.hub.local.selectProfile": "选择一个档案以查看详细统计",
  "stats.hub.training.title": "训练统计",
  "stats.hub.online.title": "在线统计",
  "stats.hub.history.title": "比赛历史",
  "stats.hub.kpi.avg3": "平均 / 3 镖",
  "stats.hub.kpi.winRate": "胜率",
  "stats.hub.kpi.bestLeg": "最佳局",
  "stats.hub.kpi.checkoutRate": "Checkout %",
  "stats.hub.sparkline.recent": "近期状态",
  "stats.hub.radar.skills": "能力雷达图",
  "stats.hub.training.clock": "时钟训练",
  "stats.hub.training.x01": "X01 训练",
  "stats.hub.training.volume": "训练量",
  "stats.hub.empty": "暂无统计数据",

  // -----------------------------
  // HISTORY / 比赛历史
  // -----------------------------
  "history.title": "比赛历史",
  "history.subtitle": "你的最近比赛",
  "history.filter.all": "全部",
  "history.filter.x01": "X01",
  "history.filter.cricket": "Cricket",
  "history.filter.training": "训练",
  "history.empty": "尚无比赛记录",
  "history.match.type.x01": "X01",
  "history.match.type.cricket": "Cricket",
  "history.match.type.training": "训练",
  "history.details.title": "比赛详情",
  "history.details.players": "玩家",
  "history.details.winner": "胜者",
  "history.details.legs": "局数",
  "history.details.sets": "套数",
  "history.details.avg3": "平均 / 3 镖",
  "history.details.checkout": "Checkout",
  "history.delete": "删除比赛",
  "history.confirmDelete": "确定永久删除该比赛？",

  // -----------------------------
  // ONLINE / 在线模式
  // -----------------------------
  "online.title": "在线模式",
  "online.subtitle": "与你的朋友远程对战",
  "online.login.title": "登录",
  "online.login.nickname": "昵称",
  "online.login.email": "电子邮箱（可选）",
  "online.login.password": "密码",
  "online.login.submit": "登录",
  "online.signup.title": "创建账号",
  "online.logout": "退出登录",
  "online.profile.title": "在线档案",
  "online.profile.country": "国家",
  "online.profile.bio": "简介",
  "online.lobby.title": "X01 房间",
  "online.lobby.create": "创建房间",
  "online.lobby.join": "加入房间",
  "online.lobby.empty": "暂无可加入房间",
  "online.friends.title": "好友",
  "online.friends.add": "添加好友",
  "online.friends.status.online": "在线",
  "online.friends.status.away": "离开",
  "online.friends.status.offline": "离线",

  // -----------------------------
  // SETTINGS / 设置
  // -----------------------------
  "settings.title": "设置",
  "settings.theme.title": "霓虹主题",
  "settings.theme.subtitle": "选择你的风格",
  "settings.theme.current": "当前主题",
  "settings.theme.applied": "主题已应用",
  "settings.lang.title": "语言",
  "settings.lang.subtitle": "应用语言",
  "settings.lang.help": "界面文本已被翻译。",
  "settings.section.language": "语言",
  "settings.section.theme": "主题",
  "settings.section.misc": "其他设置",
  "settings.misc.sounds": "声音",
  "settings.misc.vibrations": "振动",
  "settings.misc.animations": "动画效果",
  "settings.misc.resetApp": "重置应用",
  "settings.misc.resetConfirm": "确定要重置所有本地数据吗？",

  "settings.back": "返回",
  "settings.subtitle": "自定义主题与语言",

  "settings.theme.group.neons": "经典霓虹",
  "settings.theme.group.soft": "柔和色彩",
  "settings.theme.group.dark": "深色高级主题",

  "settings.theme.gold.label": "金色霓虹",
  "settings.theme.gold.desc": "高级金色主题",

  "settings.theme.pink.label": "粉色霓虹",
  "settings.theme.pink.desc": "粉色街机风格",

  "settings.theme.petrol.label": "石油蓝",
  "settings.theme.petrol.desc": "深蓝色霓虹",

  "settings.theme.green.label": "绿色霓虹",
  "settings.theme.green.desc": "明亮训练风",

  "settings.theme.magenta.label": "洋红",
  "settings.theme.magenta.desc": "高亮紫色/洋红",

  "settings.theme.red.label": "红色",
  "settings.theme.red.desc": "强烈街机红",

  "settings.theme.orange.label": "橙色",
  "settings.theme.orange.desc": "温暖充满活力的橙色",

  "settings.theme.white.label": "白色",
  "settings.theme.white.desc": "现代浅色风格",

  "settings.theme.blueOcean.label": "海洋蓝",
  "settings.theme.blueOcean.desc": "自然的海与天空蓝",

  "settings.theme.limeYellow.label": "青柠黄",
  "settings.theme.limeYellow.desc": "极亮的青柠色",

  "settings.theme.sage.label": "鼠尾草绿",
  "settings.theme.sage.desc": "柔和自然的绿色",

  "settings.theme.skyBlue.label": "天空蓝",
  "settings.theme.skyBlue.desc": "非常柔和明亮的蓝色",

  "settings.theme.darkTitanium.label": "深钛色",
  "settings.theme.darkTitanium.desc": "高级哑光金属风",

  "settings.theme.darkCarbon.label": "碳纤黑",
  "settings.theme.darkCarbon.desc": "现代碳纤质感",

  "settings.theme.darkFrost.label": "深霜黑",
  "settings.theme.darkFrost.desc": "冰冷未来感黑色",

  "settings.theme.darkObsidian.label": "黑曜石",
  "settings.theme.darkObsidian.desc": "亮面高级黑，可读性极佳",

  "settings.lang": "语言",

  "settings.reset.title": "重置应用",
  "settings.reset.subtitle":
    "删除所有本地档案、机器人、统计、比赛历史与设置。此操作不可撤销。",
  "settings.reset.button": "全部重置",

  // -----------------------------
  // SYNC / 同步中心
  // -----------------------------
  "sync.title": "同步与分享",
  "sync.subtitle": "保存并分享你的数据",
  "sync.tabs.local": "本地",
  "sync.tabs.peer": "设备对设备",
  "sync.tabs.cloud": "云端",
  "sync.local.export.title": "本地导出",
  "sync.local.export.desc": "复制此 JSON 以备份。",
  "sync.local.export.button": "生成导出文件",
  "sync.local.import.title": "本地导入",
  "sync.local.import.desc": "粘贴从其他设备导出的 JSON。",
  "sync.local.import.button": "导入 JSON",
  "sync.local.import.success": "导入成功",
  "sync.local.import.error": "导入失败，JSON 无效。",
  "sync.peer.soon": "设备对设备同步即将推出",
  "sync.cloud.soon": "云同步即将推出",

  // -----------------------------
  // 标签 / Labels
  // -----------------------------
  "label.points": "分数",
  "label.legs": "局",
  "label.sets": "套",
  "label.avg3": "平均 /3 镖",
  "label.mpr": "MPR",
  "label.checkout": "Checkout",
  "label.volume": "量",
  "label.duration": "时长",
  "label.date": "日期",
  "label.mode": "模式",

  // -----------------------------
  // 语言名称（ZH）
  // -----------------------------
  "lang.fr": "法语",
  "lang.en": "英语",
  "lang.es": "西班牙语",
  "lang.de": "德语",
  "lang.it": "意大利语",
  "lang.pt": "葡萄牙语",
  "lang.nl": "荷兰语",
  "lang.ru": "俄语",
  "lang.zh": "中文",
  "lang.ja": "日语",
  "lang.ar": "阿拉伯语",
  "lang.hi": "印地语",
  "lang.tr": "土耳其语",
  "lang.da": "丹麦语",
  "lang.no": "挪威语",
  "lang.sv": "瑞典语",
  "lang.is": "冰岛语",
  "lang.pl": "波兰语",
  "lang.ro": "罗马尼亚语",
  "lang.sr": "塞尔维亚语",
  "lang.hr": "克罗地亚语",
  "lang.cs": "捷克语",
};

export default zh;
