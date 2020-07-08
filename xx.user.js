// ==UserScript==
// @name         yunding2.0
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  helper js
// @author       叶天帝
// @match        *://yundingxx.com:3366/*
// @exclude      *://yundingxx.com:3366/login*
// @updateURL    https://raw.githubusercontent.com/whosphp/snippets/master/xx.user.js
// @downloadURL  https://raw.githubusercontent.com/whosphp/snippets/master/xx.user.js
// @grant        unsafeWindow
// @grant        GM_setValue
// @grant        GM_getValue
// @require      https://cdn.jsdelivr.net/npm/vue@2.6.11/dist/vue.js
// @require      https://cdn.jsdelivr.net/npm/element-ui@2.13.2/lib/index.js
// @require      https://cdn.jsdelivr.net/npm/later@1.2.0/later.min.js
// @run-at       document-start
// ==/UserScript==
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
		if (typeof user_id !== "undefined" && who_user !== null) {
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
		$('head').append(`
<style>
	.el-card__header {
		padding: 5px;;
	}
</style>
`)

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
		<el-link type="danger" href="/login?is_r=1">Reload</el-link>
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
			<el-button type="warning" size="mini">{{ levelUpPercentage + '%' }}</el-button>
		</el-button-group>
	</el-row>
	<el-card class="box-card" :body-style="{ padding: '5px' }">
		<div slot="header" class="clearfix">
			<span>自动FARM</span>
			<el-switch
				v-model="stores.autoFarm"
				active-color="#13ce66"
				inactive-color="#ff4949">
			</el-switch>
			<el-dialog title="请选择Fallback" :visible.sync="dialogFallbackFormVisible" :append-to-body="true">
				<el-form>
					<el-form-item label="fallback">
						<el-select v-model="stores.fallbackId">
							<el-option v-for="screen in battleScreens" :label="screen.name" :value="screen._id"></el-option>
						</el-select>
					</el-form-item>
				</el-form>
				<div slot="footer" class="dialog-footer">
					<el-button type="primary" @click="dialogFallbackFormVisible = false">确定</el-button>
				</div>
			</el-dialog>
			
			<el-button v-if="stores.autoFarm" style="float: right; padding: 3px 0" type="text" 
				@click="stores.battleSchedules = []">
				重置
			</el-button>
			<el-button v-if="stores.autoFarm" style="float: right; padding: 3px 0" type="text" 
				@click="dialogScheduleFormVisible = true">
				新增
			</el-button>
			<el-dialog title="新增Schedule" :visible.sync="dialogScheduleFormVisible" :append-to-body="true">
				<el-form :model="form">
					<el-form-item label="时间">
						<el-time-select
							:picker-options="{
								start: '00:00',
								step: '00:15',
								end: '23:59'
							}"
							v-model="form.screenTime"
							placeholder="选择时间">
						</el-time-select>
					</el-form-item>
					<el-form-item label="副本">
						<el-select v-model="form.screenId">
							<el-option v-for="screen in battleScreens" :label="screen.name" :value="screen._id"></el-option>
						</el-select>
					</el-form-item>
				</el-form>

				<div slot="footer" class="dialog-footer">
					<el-button type="primary" @click="dialogScheduleFormVisible = false">取消</el-button>
					<el-button type="success" @click="addNewSchedule">确定</el-button>
				</div>
			</el-dialog>
	  	</div>
	  	<div v-for="sch in stores.battleSchedules" class="text item">
			{{ sch.time + ' : ' + sch.screenName }}
	  	</div>
	  	<div v-if="stores.fallbackId">
	  		fallback : {{ fallbackName }} <el-button @click="dialogFallbackFormVisible = true">修改</el-button>
		</div>
	</el-card>
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
			  			<el-tag v-for="(gd, index) in scope.row.reward.goods" v-bind:key="index" size="mini">{{ gd.gname }}</el-tag>
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
					battleScreens: [],
					dialogScheduleFormVisible: false,
					dialogFallbackFormVisible: false,
					form: {
						screenId: '',
						screenTime: '',
					},
					logData: false,

					levelUpPercentage: 0,
					nextLevelUpAt: '-',

					laterInstances: [],

					stores: {
						autoBattle: stores.hasOwnProperty("autoBattle") ? stores.autoBattle : false,
						battleSchedules: stores.hasOwnProperty("battleSchedules") ? stores.battleSchedules : [],
						fallbackId: stores.hasOwnProperty("fallbackId") ? stores.fallbackId : "",
						autoFarm: stores.hasOwnProperty("autoFarm") ? stores.autoFarm : false,
						lastBatId: stores.hasOwnProperty("lastBatId") ? stores.lastBatId : "",
						lastBatName: stores.hasOwnProperty("lastBatName") ? stores.lastBatName : ""
					}
				}
			},
			mounted() {
				this.turnOffSystemAutoBattle()

				later.date.localTime()
				this.applyBattleSchedules()

				// 如果过去五分钟无战斗, 则尝试开启战斗
				setInterval(_ => {
					if (this.stores.autoBattle) {
						if (this.batLogs.length === 0
							|| moment().diff(this.batLogs[0].at, 'seconds') >= 300) {
							startBatFunc()
						}
					}
				}, 300000)

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

								// 无收益自动切换为fallback副本
								if (this.stores.autoFarm && this.stores.fallbackId) {
									selectBatIdFunc(this.stores.fallbackId, this.fallbackName)
								}
							}

							let myExp = res.data.exp.find(e => e.name === who_user.nickname)
							let myReward = res.data.player_reward.find(e => e.name === who_user.nickname)

							_batLog = {
								win: true,
								atTime: now.format('HH:mm:ss'),
								at: now,
								exp: myExp ? Math.round(myExp.exp, 2) : 0,
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

						this.levelUpPercentage = who_user.exp > who_user.nextLevelGetExp ? 100 : (who_user.exp*100/who_user.nextLevelGetExp).toFixed(2)

						needExp = needExp < 0 ? 0 : needExp
						this.nextLevelUpAt = moment().add(needExp / this.expPerSecond, 'second').format('DD HH:mm')
					}
				}, 6000)


				let mid = typeof global === "undefined" ? 1 : (typeof global.mid !== "undefined" ? global.mid : 1)
				pomelo.request("connector.teamHandler.getTeamList", {
					mid,
				}, res => {
					if (res.code === 200) {
						this.battleScreens = res.data.screens
					}
				})
			},
			watch: {
				"stores.autoFarm": function () {
					if (this.stores.autoFarm) {
						if (! this.stores.fallbackId) {
							this.dialogFallbackFormVisible = true

							this.stores.autoFarm = false
						}
					}

					this.persistentStores()
				},
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
				},
				"stores.battleSchedules": function () {
					this.persistentStores()
				},
				"stores.fallbackId": function () {
					this.persistentStores()
				}
			},
			computed: {
				battleScreensKeyById() {
					let data = {}
					this.battleScreens.map(s => {
						data[s._id] = s
					})

					return data
				},
				fallbackName() {
					let screen = this.battleScreens.find(s => s._id === this.stores.fallbackId)

					if (typeof screen === "undefined") {
						return '';
					}

					return screen.name
				},
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
				addNewSchedule() {
					this.stores.battleSchedules.push({
						time: this.form.screenTime,
						screenId: this.form.screenId,
						screenName: this.battleScreensKeyById[this.form.screenId].name
					})

					this.form.screenId = ''
					this.form.screenTime = ''
					this.dialogScheduleFormVisible = false
				},
				format(percentage) {
					return `${this.expPerSecond}(s) / ${this.nextLevelUpAt} / ${percentage}%`
				},
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
				},
				applyBattleSchedules() {
					this.laterInstances.map(instance => instance.clear())

					this.stores.battleSchedules.map(s => {
						console.log('load auto farm screen ' + s.screenName)
						this.laterInstances.push(
							later.setInterval(function () {
								console.log('auto select screen ' + s.screenName)
								selectBatIdFunc(s.screenId, s.screenName)
							}, later.parse.text(`at ${s.time}`))
						)
					})
				}
			}
		})
	}, 1000)
}, 500)

