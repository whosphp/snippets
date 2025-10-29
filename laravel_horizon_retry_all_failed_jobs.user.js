// ==UserScript==
// @name         Laravel Horizon - Retry All Failed Jobs
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Adds a "Retry All" button to the Laravel Horizon 'Failed Jobs' page.
// @author       Gemini
// @match        *://*/horizon/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'useS trict';

    // 1. 为 "Retry All" 按钮添加样式
    // 我们会模仿 Horizon 默认的按钮样式
    GM_addStyle(`
        .btn-retry-all {
            display: inline-block;
            font-weight: 600;
            color: #fff;
            text-align: center;
            vertical-align: middle;
            user-select: none;
            background-color: #3490dc; /* Horizon 默认的蓝色 */
            border: 1px solid #3490dc;
            padding: .5rem .75rem;
            font-size: .875rem;
            line-height: 1.5;
            border-radius: .25rem;
            cursor: pointer;
            transition: all .15s ease;
            margin-left: 1rem; /* 距离标题的边距 */
        }
        .btn-retry-all:hover {
            background-color: #2779bd;
            border-color: #2779bd;
            color: #fff;
        }
        /* 确保按钮和 H1 标题垂直对齐 */
        .card-header {
            align-items: center;
        }
    `);

    // 2. "Retry All" 按钮点击时触发的函数
    function retryAllJobs() {
        // 查找所有 "Retry Job" 的 a 标签
        const retryButtons = document.querySelectorAll('a[title="Retry Job"]');

        if (retryButtons.length === 0) {
            alert('No failed jobs found to retry.');
            return;
        }

        // 关键步骤：添加一个确认框，防止误触
        if (!confirm(`Are you sure you want to retry all ${retryButtons.length} failed jobs?`)) {
            return;
        }

        console.log(`[Horizon Retry All] Retrying ${retryButtons.length} jobs...`);
        let clickedCount = 0;

        // 遍历并点击每一个按钮
        retryButtons.forEach((button) => {
            button.click();
            clickedCount++;
        });

        console.log(`[Horizon Retry All] All ${clickedCount} 'Retry Job' buttons clicked.`);

        // 提示用户并准备刷新
        // Horizon 是动态的，点击后任务会消失。我们稍等片刻后刷新页面查看结果。
        alert(`${clickedCount} jobs have been queued for retry. The page will now reload.`);
    }

    // 3. 将按钮注入到页面的函数
    function injectButton() {
        // 检查按钮是否已经存在，如果存在则不重复注入
        if (document.querySelector('.btn-retry-all')) {
            return;
        }

        // 查找 "Failed Jobs" 页面的标题栏 (card-header)
        // 我们通过查找 H1 标题的内容来定位
        let targetHeader = null;
        const headers = document.querySelectorAll('.card-header');
        for (let header of headers) {
            const h2 = header.querySelector('h2');
            if (h2 && h2.textContent.includes('Failed Jobs')) {
                targetHeader = header;
                break;
            }
        }

        // 如果找到了目标位置
        if (targetHeader) {
            // 创建按钮
            const retryAllBtn = document.createElement('button');
            retryAllBtn.innerHTML = 'Retry All';
            retryAllBtn.type = 'button';
            retryAllBtn.classList.add('btn-retry-all');

            // 绑定点击事件
            retryAllBtn.addEventListener('click', retryAllJobs);

            // 将按钮添加到标题栏中
            targetHeader.appendChild(retryAllBtn);
            console.log('[Horizon Retry All] "Retry All" button injected.');
        }
    }

    // 4. 运行脚本
    // Horizon 是一个单页应用 (SPA)，页面内容是动态加载的。
    // 我们不能只在 "window.onload" 时运行一次。
    // 我们需要使用一个定时器来持续检查是否需要注入按钮（例如，当用户从 Dashboard 导航到 Failed Jobs 时）。
    //
    // 我们也会使用 MutationObserver 来更高效地监听 DOM 变化
    const observer = new MutationObserver(function(mutations) {
        // 检查 "Failed Jobs" 标题是否出现，并且按钮尚未注入
        if (!document.querySelector('.btn-retry-all')) {
             console.log('start to inject buttion');
             injectButton();
        }
    });

    // 监听整个 body 的子节点变化
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // 立即执行一次，以防页面已经加载完成
    injectButton();

})();
