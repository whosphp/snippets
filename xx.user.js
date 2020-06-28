// ==UserScript==
// @name         yunding2.0
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  helper js
// @author       叶天帝
// @match        *://yundingxx.com:3366/*
// @exclude      *://yundingxx.com:3366/login*
// @grant        unsafeWindow
// @grant        GM_setValue
// @grant        GM_getValue
// @require      https://cdn.jsdelivr.net/npm/vue@2.6.11/dist/vue.js
// @require      https://cdn.jsdelivr.net/npm/element-ui@2.13.2/lib/index.js
// @run-at document-end
// ==/UserScript==

unsafeWindow.who_user = null

// 函数覆盖
initPageUserInfo = function () {
	let rawCallback = function (data) {
		if (data.code != 200) {
			layer.msg(data.msg, {
				offset: '50%'
			})
			return
		}

		let user = data.user
		$('#current-level').text(data.currentLevelName)
		$('#next-level-name').text(data.nextLevelName)
		$('#next-level-num').text(data.nextLevelGetExp)
		if (user.wear_title) {
			initUserTitleText(user.wear_title)
		}
		for (const key in user) {
			if (user.hasOwnProperty(key)) {
				const element = user[key];
				let str = !isNaN(element) ? parseInt(element) : element
				$("#uinfo_" + key).text(str)
			}
		}
		if (user.potential_num > 0) {
			$(".add-user-ptn").css("display", "inherit")
		}
	}

	pomelo.request("connector.userHandler.userInfo", {
	}, data => {
		if (data.code == 200) {
			console.log('user info updated')
			unsafeWindow.who_user = data.user
			who_user.nextLevelGetExp = data.nextLevelGetExp
		}

		rawCallback(data)
	});
}

let who_interval = setInterval(function () {
	'use strict'

	// 等待 pomelo 初始化 ws 链接
	if (user_id !== undefined && who_user !== null) {
		clearInterval(who_interval)
	}

	if (user_id !== undefined && who_user === null) {
		initPageUserInfo()
		return
	}

	setInterval(_ => {
		initPageUserInfo()
	}, 60000)

	let who_user_id = user_id
	let consolelog = true

	console.log('start loading...')

	$('head').append(`<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/element-ui@2.13.2/lib/theme-chalk/index.css">`)

	console.log('stop loading')

	$('.pdf:first').append(`
<div id="whoapp">
	<el-row>
		<el-button-group>
		  	<el-button size="mini">{{ bat_rate + '%' }}</el-button>
		  	<el-button type="success" size="mini">{{ bat_ok }}</el-button>
		  	<el-button type="warning" size="mini">{{ bat_fail }}</el-button>
		  	<el-button type="primary" size="mini">{{ bat_total }}</el-button>
			<el-button @click="batReset" size="mini" icon="el-icon-refresh-left" type="danger"></el-button>
		</el-button-group>
	</el-row>
	<el-row>
		<el-switch
			v-model="stores.autoBattle"
		  	active-color="#13ce66"
		  	inactive-color="#ff4949">
		</el-switch>
	</el-row>
	<el-row>
		<el-button-group>
			<el-button type="success" size="mini">{{ expPerSecond }}</el-button>
			<el-button type="primary" size="mini">{{ nextLevelUpAt }}</el-button>
		</el-button-group>
	</el-row>
	<el-table
			:show-header="false"
		  	:data="latestBatchLogs"
		  	size="mini"
		  	style="width: 100%">
		  	<el-table-column
				prop="atTime"
				label="Time">
		  	</el-table-column>
		  	<el-table-column
				prop="exp"
				label="Exp">
		  	</el-table-column>
		</el-table>
</div>`)

	function getKey(key) {
		return who_user_id + ':' + key
	}

	function log(str) {
		if (consolelog) {
			console.log(str)
		}
	}

	unsafeWindow.who_app = new Vue({
		el: "#whoapp",
		data: function () {
			return {
				bat_auto_interval: null,
				bat_ok: 0,
				bat_fail: 0,
				bat_total: 0,

				batLogs: [],

				nextLevelUpAt: '-',

				stores: GM_getValue(getKey('stores'), {
					autoBattle: false
				})
			}
		},
		mounted() {
			// 切换至 驿站组队
			$('#team-tap').click()

			// 尝试创建队伍
			createdTeamFunc()

			if (this.stores.autoBattle) {
				log('auto start battle after refresh')
				startBatFunc()
			}

			pomelo.on('onRoundBatEnd', res => {
				if (res.data.win > 0) {
					log('end')

					if (this.stores.autoBattle) {
						log('auto start')
						startBatFunc()
					}

					if (res.data.win === 1) {
						let myExp = res.data.exp.find(e => e.name === who_user.nickname)
						let myReward = res.data.player_reward.find(e => e.name === who_user.nickname)
						let now = moment()
						if (this.batLogs.unshift({
							atTime: now.format('HH:mm:ss'),
							at: now,
							exp: myExp.exp,
							expRate: myExp.exp_rate,
							reward: myReward,
						}) > 300) {
							this.batLogs.pop()
						}

						this.bat_ok++
					} else {
						this.bat_fail++
					}

					this.bat_total++
				}
			})

			setInterval(_ => {
				if (this.expPerSecond > 0) {
					let needExp = who_user.nextLevelGetExp - who_user.exp
					needExp = needExp < 0 ? 0 : needExp
					this.nextLevelUpAt = moment().add(needExp / this.expPerSecond, 'second').format('DD HH:mm')
				}
			}, 6000)
		},
		created() {
			if (this.stores.autoBattle) {
				log('auto start')
				startBatFunc()
			}
		},
		watch: {
			"stores.autoBattle": function (n) {
				// this.autoBattleHandler()
				if (n) {
					log('auto start')
					startBatFunc()
				}

				this.persistentStores()
			}
		},
		computed: {
			bat_rate() {
				if (this.bat_total) {
					return (this.bat_ok * 100 / this.bat_total).toFixed(1)
				} else {
					return 0
				}
			},
			latestBatchLogs() {
				return this.batLogs.slice(0, 5)
			},
			expPerSecond() {
				let logs = this.batLogs.slice(0, 30)
				let length = logs.length

				if (length < 2) {
					return 0;
				}

				let latest = logs[0];
				let oldest = logs[length - 1]

				let seconds = latest.at.diff(oldest.at, 'seconds')

				let totalExp = 0 - oldest.exp
				logs.map(log => {
					totalExp+= log.exp
				})

				return (totalExp / seconds).toFixed(2)
			}
		},
		methods: {
			autoBattleHandler() {
				if (this.stores.autoBattle) {
					this.bat_auto_interval = setInterval(function () {
						startBatFunc()
					}, 6100)
					console.log('enable auto battle')
				} else {
					if (this.bat_auto_interval) {
						clearInterval(this.bat_auto_interval)
						console.log('disable auto battle')
					}
				}
			},
			batReset() {
				this.bat_ok = 0
				this.bat_fail = 0
				this.bat_total = 0
			},
			persistentStores() {
				log('persistentStores...')
				GM_setValue(getKey('stores'), this.stores)
			}
		}
	})
}, 1000)

