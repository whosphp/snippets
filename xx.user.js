// ==UserScript==
// @name         yunding2.0
// @namespace    http://tampermonkey.net/
// @version      0.0.2-dev
// @description  helper js
// @author       叶天帝
// @match        *://yundingxx.com:3366/*
// @exclude      *://yundingxx.com:3366/login*
// @grant        unsafeWindow
// @grant        GM_setValue
// @grant        GM_getValue
// @require      https://cdn.jsdelivr.net/npm/vue@2.6.11/dist/vue.js
// @require      https://cdn.jsdelivr.net/npm/element-ui@2.13.2/lib/index.js
// @run-at document-start
// ==/UserScript==

let _href = window.location.href
console.log('real href is ' + _href)

unsafeWindow.who_is_r = window.location.href.indexOf("is_r") > -1;

let aaa = setInterval(function () {
	if (typeof initPageUserInfo !== 'function') {
		console.log('wait necessary functions to load...')
		return
	}

	clearInterval(aaa)

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

		let _oldSelectBatIdFunc = selectBatIdFunc
		selectBatIdFunc = function (cbatid, name) {
			who_app.stores.lastBatId = cbatid
			who_app.stores.lastBatName = name

			_oldSelectBatIdFunc(cbatid, name)
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
				label="Time">
				<template slot-scope="scope">
					<el-tag :type="scope.row.win ? 'success' : 'danger'" size="mini" >{{ scope.row.atTime }}</el-tag>
				</template>
		  	</el-table-column>
		  	<el-table-column
				prop="exp"
				label="Exp">
		  	</el-table-column>
		  	<el-table-column
				label="Goods">
			  	<template slot-scope="scope">
			  		<template v-if="scope.row.reward.goods">
			  			<el-tag v-for="gd in scope.row.reward.goods" size="mini">{{ gd.gname }}</el-tag>
					</v-if>
			  	</template>
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

		let stores = GM_getValue(getKey('stores'), {})

		unsafeWindow.who_app = new Vue({
			el: "#whoapp",
			data: function () {
				return {
					bat_auto_interval: null,
					bat_ok: 0,
					bat_fail: 0,
					bat_total: 0,

					batLogs: [],
					batDetailLogs: [],
					logData: false,

					nextLevelUpAt: '-',

					stores: {
						autoBattle: stores.hasOwnProperty("autoBattle") ? stores.autoBattle : false,
						lastBatId: stores.hasOwnProperty("lastBatId") ? stores.lastBatId : "",
						lastBatName: stores.hasOwnProperty("lastBatName") ? stores.lastBatName : ""
					}
				}
			},
			mounted() {
				this.turnOffSystemAutoBattle()

				/**
				 * 系统重载会自动切换至驿站组队 并自动开始战斗
				 * 所以当是系统重载时不做操作
				 */
				if (! who_is_r) {
					if (this.stores.autoBattle) {
						// 切换至 驿站组队
						$('#team-tap').click()

						setTimeout(_ => {
							// 尝试创建队伍
							createdTeamFunc()

							// 如果当前没有选择地图, 默认使用上次进入的地图
							if (! $("#bat-screen-id-h").val()) {
								selectBatIdFunc(
									this.stores.lastBatId,
									this.stores.lastBatName
								)
							}

							log('auto start battle after refresh')
							setTimeout(_ => {
								startBatFunc()
							}, 1000)
						}, 500)
					}
				}

				pomelo.on('onRoundBatEnd', res => {
					if (res.data.win > 0) {
						log('end')

						// 保留最近50场战斗的详细记录
						let _detailLog = []
						$($('#logs').children().get().reverse()).each((index, node) => _detailLog.push(node.innerText))
						if (this.batDetailLogs.unshift(_detailLog) > 50) {
							this.batDetailLogs.pop()
						}

						if (this.logData) {
							log(res.data)
						}

						if (this.stores.autoBattle) {
							log('auto start')
							startBatFunc()
						}

						let _batLog
						let now = moment()

						if (res.data.win === 1) {
							if (res.data.exp.length === 0) {
								console.log('全队无收益')
								this.$notify({
									title: '警告',
									message: '全队无收益',
									type: 'warning'
								});
							}

							let myExp = res.data.exp.find(e => e.name === who_user.nickname)
							let myReward = res.data.player_reward.find(e => e.name === who_user.nickname)

							_batLog = {
								win: true,
								atTime: now.format('HH:mm:ss'),
								at: now,
								exp: myExp ? myExp.exp : 0,
								expRate: myExp ? myExp.exp_rate : 0,
								reward: myReward ? myReward : [],
							}

							this.bat_ok++
						} else {
							_batLog = {
								win: false,
								atTime: now.format('HH:mm:ss'),
								at: now,
								exp: 0,
								expRate: 1,
								reward: [],
							}

							this.bat_fail++
						}

						if (this.batLogs.unshift(_batLog) > 300) {
							this.batLogs.pop()
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
			watch: {
				"stores.autoBattle": function (n) {
					this.turnOffSystemAutoBattle()

					if (n) {
						log('auto start')
						startBatFunc()
					}

					this.persistentStores()
				},
				"stores.lastBatId": function () {
					this.persistentStores()
				},
				"stores.lastBatName": function () {
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
				turnOffSystemAutoBattle() {
					if (this.stores.autoBattle) {
						// 关闭系统的循环开关
						localStorage.removeItem('for_bat')
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
}, 100)

