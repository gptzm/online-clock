(function() {
    var weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    var previousTime = {};
    var currentScale = 1;
    var minScale = 0.5;
    var maxScale = 2.0;
    var scaleStep = 0.1;
    var secondsVisible = true;
    var animating = {};
    var hourlyBellEnabled = false;
    var bellAudio = new Audio('./assets/audio/bell.mp3');
    var storageAvailable = checkStorageAvailable('localStorage');
    var isDarkTheme = true; // 默认深色主题
    
    // 时钟位置变量
    var clockPosition = 0; // 垂直位置偏移，默认为0
    var isDragging = false; // 是否正在拖动
    var dragStartY = 0; // 开始拖动时的Y坐标
    var dragStartPosition = 0; // 开始拖动时的位置
    var defaultClockPosition = 0; // 默认时钟位置
    
    // 尺寸调整变量
    var timeScale = 1; // 时间区域缩放比例（保留但不再使用）
    var dateScale = 1; // 日期区域缩放比例
    var isResizingTime = false; // 不再使用但保留变量避免错误
    var isResizingDate = false; // 是否正在调整日期区域大小
    var resizeStartX = 0; // 开始调整大小时的X坐标
    var resizeStartScale = 1; // 开始调整大小时的缩放比例
    var initialTimeScale = 1; // 初始时间缩放比例（保留但不再使用）
    var initialDateScale = 1; // 初始日期缩放比例
    var defaultTimeScale = 1; // 默认时间缩放比例
    var defaultDateScale = 1; // 默认日期缩放比例
    var defaultScale = 1; // 默认整体缩放比例
    
    // 报时小时设置，默认8点到20点
    var hourlyBellHours = {};
    for (var i = 0; i < 24; i++) {
        hourlyBellHours[i] = (i >= 8 && i <= 20);
    }
    
    // 预先加载的钟声列表
    var bellSounds = [];
    var bellSoundsLoaded = false;
    
    // 添加自定义全屏模式状态
    var isCustomFullscreen = false;
    
    // 初始化钟声，预加载多个音频对象以供连续播放使用
    function initBellSounds() {
        try {
            // 为多次报时预先创建多个音频对象
            for (var i = 0; i < 12; i++) {
                var sound = new Audio('./assets/audio/bell.mp3');
                sound.preload = 'auto';
                // 设置初始音量为0.01以实现静音
                sound.volume = 0.01;
                // 对于iOS设备，设置playsinline属性以允许自动播放
                sound.setAttribute('playsinline', '');
                sound.setAttribute('webkit-playsinline', '');
                bellSounds.push(sound);
            }
            bellSoundsLoaded = true;
            logDebug('钟声音频初始化完成, 数量: ' + bellSounds.length);
        } catch(e) {
            logDebug('初始化钟声列表出错: ' + e.message);
        }
    }
    
    // 检查是否支持localStorage
    function checkStorageAvailable(type) {
        try {
            var storage = window[type],
                x = '__storage_test__';
            storage.setItem(x, x);
            storage.removeItem(x);
            return true;
        } catch(e) {
            return false;
        }
    }
    
    // 保存设置到localStorage
    function saveSettings() {
        if (!storageAvailable) return;
        
        try {
            var settings = {
                scale: currentScale,
                showSeconds: secondsVisible,
                hourlyBellEnabled: hourlyBellEnabled,
                hourlyBellHours: hourlyBellHours,
                multiBell: document.getElementById('multiBellCheckbox') && 
                          document.getElementById('multiBellCheckbox').checked,
                isDarkTheme: isDarkTheme,
                clockPosition: clockPosition, // 保存时钟位置
                timeScale: timeScale, // 保存时间区域缩放比例
                dateScale: dateScale // 保存日期区域缩放比例
            };
            
            localStorage.setItem('clockSettings', JSON.stringify(settings));
            logDebug('设置已保存到localStorage');
        } catch(e) {
            logDebug('保存设置出错: ' + e.message);
        }
    }
    
    // 从localStorage加载设置
    function loadSettings() {
        if (!storageAvailable) return;
        
        try {
            var savedSettings = localStorage.getItem('clockSettings');
            if (savedSettings) {
                var settings = JSON.parse(savedSettings);
                
                // 恢复缩放比例
                if (settings.scale !== undefined) {
                    currentScale = settings.scale;
                    setScale(currentScale);
                }
                
                // 恢复秒显示设置
                if (settings.showSeconds !== undefined) {
                    secondsVisible = settings.showSeconds;
                    var timeSection = document.getElementById('timeSection');
                    var toggleBtn = document.getElementById('toggleSecondsBtn');
                    if (timeSection && toggleBtn) {
                        if (secondsVisible) {
                            timeSection.classList.remove('hide-seconds');
                            toggleBtn.textContent = '隐藏秒';
                        } else {
                            timeSection.classList.add('hide-seconds');
                            toggleBtn.textContent = '显示秒';
                        }
                    }
                }
                
                // 恢复整点报时设置
                if (settings.hourlyBellEnabled !== undefined) {
                    hourlyBellEnabled = settings.hourlyBellEnabled;
                    var toggleBtn = document.getElementById('toggleBellBtn');
                    if (toggleBtn) {
                        if (hourlyBellEnabled) {
                            toggleBtn.textContent = '关闭报时';
                            toggleBtn.classList.add('active');
                        } else {
                            toggleBtn.textContent = '整点报时';
                            toggleBtn.classList.remove('active');
                        }
                    }
                }
                
                // 恢复报时小时设置
                if (settings.hourlyBellHours) {
                    hourlyBellHours = settings.hourlyBellHours;
                }
                
                // 恢复多次敲钟设置
                if (settings.multiBell !== undefined) {
                    var multiBellCheckbox = document.getElementById('multiBellCheckbox');
                    if (multiBellCheckbox) {
                        multiBellCheckbox.checked = settings.multiBell;
                    }
                }
                
                // 恢复主题设置
                if (settings.isDarkTheme !== undefined) {
                    isDarkTheme = settings.isDarkTheme;
                    applyTheme();
                }
                
                // 恢复时钟位置
                if (settings.clockPosition !== undefined) {
                    clockPosition = settings.clockPosition;
                    applyClockPosition();
                }
                
                // 恢复时间和日期区域缩放比例
                if (settings.timeScale !== undefined) {
                    timeScale = settings.timeScale;
                    applyTimeScale();
                }
                
                if (settings.dateScale !== undefined) {
                    dateScale = settings.dateScale;
                    applyDateScale();
                }
                
                logDebug('从localStorage加载设置成功');
            }
        } catch(e) {
            logDebug('加载设置出错: ' + e.message);
        }
    }
    
    // 应用当前主题
    function applyTheme() {
        if (isDarkTheme) {
            document.body.classList.remove('light-theme');
        } else {
            document.body.classList.add('light-theme');
        }
    }
    
    // 切换主题
    function toggleTheme() {
        isDarkTheme = !isDarkTheme;
        applyTheme();
        saveSettings();
        logDebug('切换主题: ' + (isDarkTheme ? '深色' : '浅色'));
    }
    
    // 调试函数
    function logDebug(message) {
        console.log('[翻页时钟] ' + message);
    }
    
    function padNumber(num) {
        return num < 10 ? '0' + num : String(num);
    }

    function updateDate() {
        try {
            var now = new Date();
            var year = now.getFullYear();
            var month = now.getMonth() + 1;
            var date = now.getDate();
            var day = now.getDay();
            
            var dateElement = document.querySelector('.date');
            if(dateElement) dateElement.textContent = year + '年' + month + '月' + date + '日 星期' + weekDays[day];
        } catch(e) {
            logDebug('更新日期出错: ' + e.message);
        }
    }

    function updateClock() {
        try {
            var now = new Date();
            var hours = now.getHours();
            var minutes = now.getMinutes();
            var seconds = now.getSeconds();

            // 整点报时检查
            if (hourlyBellEnabled && minutes === 0 && seconds === 0) {
                if (hourlyBellHours[hours]) {
                    playHourlyBell(hours);
                }
            }

            logDebug('当前时间: ' + hours + ':' + minutes + ':' + seconds);

            var time = {
                hoursTens: Math.floor(hours / 10),
                hoursOnes: hours % 10,
                minutesTens: Math.floor(minutes / 10),
                minutesOnes: minutes % 10,
                secondsTens: Math.floor(seconds / 10),
                secondsOnes: seconds % 10
            };

            // 更新时间显示
            for (var key in time) {
                if (time.hasOwnProperty(key)) {
                    if (previousTime[key] !== time[key]) {
                        if (!secondsVisible && key.indexOf('seconds') === 0) continue; // Skip seconds if hidden
                        var containerClass = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                        updateDigit(containerClass, time[key], previousTime[key] || 0);
                    }
                }
            }

            // 使用普通对象复制而不是展开运算符
            var newTime = {};
            for (var key in time) {
                if (time.hasOwnProperty(key)) {
                    newTime[key] = time[key];
                }
            }
            previousTime = newTime;
        } catch(e) {
            logDebug('更新时钟出错: ' + e.message);
        }
    }

    function updateDigit(containerClass, newValue, oldValue) {
        try {
            var container = document.querySelector('.' + containerClass);
            if (!container) {
                logDebug('找不到容器: ' + containerClass);
                return;
            }

            var card = container.querySelector('.card');
            if (!card) {
                logDebug('找不到卡片元素');
                return;
            }
            
            var top = card.querySelector('.top .digit');
            var bottom = card.querySelector('.bottom .digit');
            var flap = card.querySelector('.flap');
            var flapDigit = flap.querySelector('.digit');

            if (!top || !bottom || !flap || !flapDigit) {
                logDebug('找不到必要的数字元素');
                return;
            }

            // 如果数字相同，不执行动画
            if (newValue === oldValue) return;
            
            // 如果该元素正在动画中，则跳过
            if (animating[containerClass]) return;
            animating[containerClass] = true;

            // 初始状态：上、下、翻页片都显示旧值
            top.textContent = oldValue;
            bottom.textContent = oldValue;
            flapDigit.textContent = oldValue;

            // 移除之前的动画
            flap.classList.remove('flipping');
            
            // 强制浏览器重排
            if (flap.offsetWidth) {
                // 使用setTimeout模拟requestAnimationFrame
                setTimeout(function() {
                    flap.classList.add('flipping');
                    
                    // 在翻页开始后延迟更新翻页片和下片为新值
                    setTimeout(function() {
                        flapDigit.textContent = newValue;
                        bottom.textContent = newValue;
                    }, 400);
                    
                    // 在翻页开始后延迟更新上片为新值
                    setTimeout(function() {
                        top.textContent = newValue;
                    }, 200);
                }, 50);

                // 动画结束后移除样式
                setTimeout(function() {
                    flap.classList.remove('flipping');
                    animating[containerClass] = false;
                }, 600);
            }
        } catch(e) {
            logDebug('更新数字出错: ' + e.message);
            animating[containerClass] = false;
        }
    }

    // 整点报时功能
    function playHourlyBell(hours) {
        try {
            logDebug('整点报时: ' + hours + '点');
            // 确保小时在1-12之间
            var bellHour = hours % 12;
            if (bellHour === 0) bellHour = 12;
            
            // 获取多次敲钟设置
            var multiBellCheckbox = document.getElementById('multiBellCheckbox');
            var isMultiBell = multiBellCheckbox && multiBellCheckbox.checked;
            
            // 如果启用了多次敲钟模式，则根据小时数敲钟
            var bellCount = isMultiBell ? bellHour : 1;
            
            logDebug('敲钟设置: bellHour=' + bellHour + ', bellCount=' + bellCount + ', isMultiBell=' + isMultiBell);
            
            // 确保音频文件已经加载
            if (!bellSoundsLoaded) {
                initBellSounds();
            }
            
            // 播放第一次钟声
            playBellSoundIndex(0);
            
            // iOS设备多次敲钟特殊处理
            if (bellCount > 1) {
                // iOS可能需要用户交互才能播放多个声音
                // 使用预先加载的多个音频对象
                var bellIntervals = [];
                
                for (var i = 1; i < bellCount; i++) {
                    (function(index) {
                        bellIntervals.push(
                            setTimeout(function() {
                                logDebug('播放第 ' + (index + 1) + ' 次钟声，共 ' + bellCount + ' 次');
                                playBellSoundIndex(index);
                            }, index * 3000)
                        );
                    })(i);
                }
                
                // 将定时器存储到一个全局数组中，以防止被垃圾回收
                window.currentBellIntervals = bellIntervals;
            }
        } catch(e) {
            logDebug('整点报时出错: ' + e.message);
        }
    }
    
    // 使用预加载的音频对象播放钟声
    function playBellSoundIndex(index) {
        try {
            if (!bellSoundsLoaded) {
                initBellSounds();
            }
            
            // 确保索引在有效范围内
            var safeIndex = index % bellSounds.length;
            var sound = bellSounds[safeIndex];
            
            if (sound) {
                // 重置音频，确保从头开始播放
                sound.currentTime = 0;
                
                // 设置音量 - 根据当前时间判断是否为工作时段
                var now = new Date();
                var currentHour = now.getHours();
                // 工作时段为8-20点
                var isBusinessHour = currentHour >= 8 && currentHour <= 20;
                
                // 设置音量，非工作时段为工作时段的70%
                sound.volume = isBusinessHour ? 1.0 : 0.7;
                
                // 尝试播放音频
                var playPromise = sound.play();
                
                // 现代浏览器需要处理Promise
                if (playPromise !== undefined) {
                    playPromise.then(function() {
                        logDebug('钟声#' + safeIndex + '播放成功, 音量: ' + sound.volume);
                    }).catch(function(error) {
                        logDebug('钟声#' + safeIndex + '播放失败: ' + error);
                        
                        // 在iOS上，可能需要用户交互
                        if (error.name === 'NotAllowedError') {
                            logDebug('iOS播放限制: 需要用户交互才能播放音频');
                        }
                    });
                } else {
                    logDebug('旧浏览器: playPromise未定义');
                }
            } else {
                logDebug('播放钟声出错: 音频对象未找到，索引=' + safeIndex);
            }
        } catch(e) {
            logDebug('播放钟声出错: ' + e.message);
        }
    }

    // 向后兼容的播放函数
    function playBellSound() {
        playBellSoundIndex(0);
    }

    // 试听当前小时的报时音效
    function testHourlyBell() {
        try {
            var now = new Date();
            var currentHour = now.getHours();
            
            // 获取多次敲钟设置
            var multiBellCheckbox = document.getElementById('multiBellCheckbox');
            var isMultiBell = multiBellCheckbox && multiBellCheckbox.checked;
            
            // 输出调试信息
            logDebug('试听音效: 当前小时=' + currentHour + ', 多次敲钟=' + isMultiBell);
            
            // 对于试听功能，我们需要确保用户已经有交互行为
            // 确保音频已经加载
            if (!bellSoundsLoaded) {
                initBellSounds();
            }
            
            // 如果启用多次敲钟，播放对应小时数的钟声
            if (isMultiBell) {
                playHourlyBell(currentHour);
            } else {
                // 否则只播放一次
                playBellSound();
            }
        } catch(e) {
            logDebug('试听音效出错: ' + e.message);
        }
    }

    function setScale(scale) {
        try {
            currentScale = scale;
            applyClockPosition(); // 这会同时应用缩放和位置，并确保时钟不超出屏幕
        } catch(e) {
            logDebug('设置缩放出错: ' + e.message);
        }
    }

    function zoomIn() {
        currentScale = Math.min(maxScale, currentScale + scaleStep);
        setScale(currentScale);
        saveSettings();
    }

    function zoomOut() {
        currentScale = Math.max(minScale, currentScale - scaleStep);
        setScale(currentScale);
        saveSettings();
    }

    function toggleSeconds() {
        try {
            secondsVisible = !secondsVisible;
            var timeSection = document.getElementById('timeSection');
            var toggleBtn = document.getElementById('toggleSecondsBtn');
            if (timeSection && toggleBtn) {
                if (secondsVisible) {
                    timeSection.classList.remove('hide-seconds');
                    toggleBtn.textContent = '隐藏秒';
                } else {
                    timeSection.classList.add('hide-seconds');
                    toggleBtn.textContent = '显示秒';
                }
            }
            // Immediately update clock display after toggling seconds
            updateClock(); 
            saveSettings();
        } catch(e) {
            logDebug('切换秒显示出错: ' + e.message);
        }
    }
    
    // 创建小时复选框
    function createHourCheckboxes() {
        try {
            var container = document.getElementById('hoursCheckboxes');
            if (!container) return;
            
            container.innerHTML = '';
            
            // 创建两行时间选择器
            for (var row = 0; row < 2; row++) {
                var rowDiv = document.createElement('div');
                rowDiv.className = 'hours-row';
                
                // 每行12个小时
                for (var i = 0; i < 12; i++) {
                    var hour = row * 12 + i;
                    // 只显示数字，不显示":00"
                    var hourLabel = padNumber(hour);
                    var checked = hourlyBellHours[hour];
                    
                    var hourDiv = document.createElement('div');
                    hourDiv.className = 'hour-item';
                    if (checked) {
                        hourDiv.classList.add('selected');
                    }
                    
                    hourDiv.setAttribute('data-hour', hour);
                    hourDiv.textContent = hourLabel;
                    
                    // 添加点击事件
                    hourDiv.addEventListener('click', function() {
                        var hourValue = parseInt(this.getAttribute('data-hour'));
                        // 切换选中状态
                        this.classList.toggle('selected');
                        // 更新小时设置
                        hourlyBellHours[hourValue] = this.classList.contains('selected');
                    });
                    
                    rowDiv.appendChild(hourDiv);
                }
                
                container.appendChild(rowDiv);
            }
        } catch(e) {
            logDebug('创建小时选择出错: ' + e.message);
        }
    }
    
    // 显示报时设置面板
    function showBellSettings() {
        try {
            var settingsPanel = document.getElementById('bellSettingsPanel');
            if (settingsPanel) {
                createHourCheckboxes();
                settingsPanel.style.display = 'block';
                
                // 检测Safari或iOS设备
                var multiBellCheckbox = document.getElementById('multiBellCheckbox');
                if (multiBellCheckbox) {
                    // 重置为正常状态
                    multiBellCheckbox.disabled = false;
                    multiBellCheckbox.parentNode.style.opacity = "1";
                    multiBellCheckbox.parentNode.title = "";
                    
                    // 移除警告文字（如果存在）
                    var warningSpan = multiBellCheckbox.parentNode.querySelector('.safari-warning');
                    if (warningSpan) {
                        multiBellCheckbox.parentNode.removeChild(warningSpan);
                    }
                }
                
                // 添加点击其他区域关闭面板的事件
                setupOutsideClickListener();
            }
        } catch(e) {
            logDebug('显示报时设置出错: ' + e.message);
        }
    }
    
    // 添加函数，在点击面板外区域时关闭面板
    function setupOutsideClickListener() {
        // 移除旧的事件监听器（如果存在）
        document.removeEventListener('click', handleOutsideClick);
        
        // 延迟添加事件监听器，避免直接触发
        setTimeout(function() {
            document.addEventListener('click', handleOutsideClick);
        }, 10);
    }

    // 处理外部点击事件
    function handleOutsideClick(event) {
        var settingsPanel = document.getElementById('bellSettingsPanel');
        
        // 如果面板不可见，移除监听器
        if (settingsPanel.style.display !== 'block') {
            document.removeEventListener('click', handleOutsideClick);
            return;
        }
        
        // 点击的是按钮或面板内部元素，不关闭
        if (event.target.id === 'toggleBellBtn' || 
            settingsPanel.contains(event.target) || 
            event.target.className === 'test-bell-btn' ||
            event.target.id === 'multiBellCheckbox') {
            return;
        }
        
        // 点击了其他区域，关闭面板
        settingsPanel.style.display = 'none';
        document.removeEventListener('click', handleOutsideClick);
    }
    
    // 保存报时设置
    function saveBellSettings() {
        try {
            // 保存小时设置
            var hourItems = document.querySelectorAll('.hour-item');
            hourItems.forEach(function(item) {
                var hour = parseInt(item.getAttribute('data-hour'));
                hourlyBellHours[hour] = item.classList.contains('selected');
            });
            
            // 关闭设置面板
            var settingsPanel = document.getElementById('bellSettingsPanel');
            if (settingsPanel) {
                settingsPanel.style.display = 'none';
            }
            
            // 保存设置到localStorage
            saveSettings();
            
            logDebug('报时设置已保存');
        } catch(e) {
            logDebug('保存报时设置出错: ' + e.message);
        }
    }
    
    // 取消报时设置
    function cancelBellSettings() {
        try {
            var settingsPanel = document.getElementById('bellSettingsPanel');
            if (settingsPanel) {
                settingsPanel.style.display = 'none';
            }
        } catch(e) {
            logDebug('取消报时设置出错: ' + e.message);
        }
    }
    
    // 全选所有小时
    function selectAllHours() {
        try {
            var hourItems = document.querySelectorAll('.hour-item');
            hourItems.forEach(function(item) {
                item.classList.add('selected');
            });
        } catch(e) {
            logDebug('全选小时出错: ' + e.message);
        }
    }
    
    // 选择工作时间（8-20点）
    function selectBusinessHours() {
        try {
            var hourItems = document.querySelectorAll('.hour-item');
            hourItems.forEach(function(item) {
                var hour = parseInt(item.getAttribute('data-hour'));
                if (hour >= 8 && hour <= 20) {
                    item.classList.add('selected');
                } else {
                    item.classList.remove('selected');
                }
            });
        } catch(e) {
            logDebug('选择工作时间出错: ' + e.message);
        }
    }
    
    // 清除所有选择
    function selectNone() {
        try {
            var hourItems = document.querySelectorAll('.hour-item');
            hourItems.forEach(function(item) {
                item.classList.remove('selected');
            });
        } catch(e) {
            logDebug('清除选择出错: ' + e.message);
        }
    }
    
    function toggleHourlyBell() {
        try {
            hourlyBellEnabled = !hourlyBellEnabled;
            var toggleBtn = document.getElementById('toggleBellBtn');
            if (toggleBtn) {
                if (hourlyBellEnabled) {
                    toggleBtn.textContent = '关闭报时';
                    toggleBtn.classList.add('active');
                    // 显示设置面板
                    showBellSettings();
                } else {
                    toggleBtn.textContent = '整点报时';
                    toggleBtn.classList.remove('active');
                }
            }
            
            // 保存设置到localStorage
            saveSettings();
            
        } catch(e) {
            logDebug('切换整点报时出错: ' + e.message);
        }
    }

    // 修改全屏切换函数，针对iOS设备使用自定义全屏模式
    function toggleFullScreen() {
        try {
            // 检查是否在iOS设备
            var isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
            
            // 对于iOS设备，使用自定义全屏模式
            if (isIOS) {
                toggleCustomFullscreen();
                return;
            }
            
            // 对其他设备使用标准全屏API
            // 检查是否在全屏模式
            var isFullScreen = document.fullscreenElement || 
                document.mozFullScreenElement || 
                document.webkitFullscreenElement || 
                document.msFullscreenElement;
            
            logDebug('全屏状态: ' + (isFullScreen ? '已开启' : '未开启'));
            
            if (!isFullScreen) {
                // 进入全屏
                var docElm = document.documentElement;
                if (docElm.requestFullscreen) {
                    console.log('docElm.requestFullscreen()');
                    docElm.requestFullscreen();
                } else if (docElm.msRequestFullscreen) {
                    docElm.msRequestFullscreen();
                } else if (docElm.mozRequestFullScreen) {
                    docElm.mozRequestFullScreen();
                } else if (docElm.webkitRequestFullscreen) {
                    docElm.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
                }
                toggleCustomFullscreen();
            } else {
                // 退出全屏
                try {
                    if (document.exitFullscreen) {
                        document.exitFullscreen();
                    } else if (document.msExitFullscreen) {
                        document.msExitFullscreen();
                    } else if (document.mozCancelFullScreen) {
                        document.mozCancelFullScreen();
                    } else if (document.webkitExitFullscreen) {
                        document.webkitExitFullscreen();
                    }
                    exitCustomFullscreen();
                } catch (err) {
                    logDebug('退出全屏出错: ' + err.message);
                    // 强制退出自定义全屏
                    exitCustomFullscreen();
                }
                isCustomFullscreen = false;
            }
        } catch(e) {
            logDebug('切换全屏出错: ' + e.message);
            // 出错时尝试自定义全屏
            toggleCustomFullscreen();
        }
    }
    
    // 添加自定义全屏模式切换函数
    function toggleCustomFullscreen() {
        if (!isCustomFullscreen) {
            enterCustomFullscreen();
        } else {
            exitCustomFullscreen();
        }
    }

    // 进入自定义全屏模式
    function enterCustomFullscreen() {
        try {
            isCustomFullscreen = true;
            
            // 更新全屏按钮文本
            var fullscreenBtn = document.getElementById('fullscreenBtn');
            if (fullscreenBtn) {
                fullscreenBtn.innerHTML = '⤓';
                if (!supportsEmoji('⤓')) {
                    fullscreenBtn.innerHTML = '退出';
                }
                fullscreenBtn.setAttribute('data-fullscreen', 'true');
            }
            
            // 添加全屏模式类，隐藏控制按钮
            document.body.classList.add('fullscreen-mode');
            
            // 应用时钟位置，确保在全屏模式下保持一致
            applyClockPosition();
            
            // 添加额外的iOS全屏样式
            var style = document.createElement('style');
            style.id = 'ios-fullscreen-style';
            style.innerHTML = `
                body.fullscreen-mode {
                    position: fixed;
                    width: 100%;
                    height: 100%;
                    left: 0;
                    top: 0;
                    z-index: 9999;
                }
                .fullscreen-mode .controls {
                    display: none !important;
                }
                .fullscreen-mode .theme-toggle-btn {
                    display: none !important;
                }
                .fullscreen-mode .resize-handle {
                    display: none !important;
                }
            `;
            document.head.appendChild(style);
            
            logDebug('已进入自定义全屏模式');
        } catch(e) {
            logDebug('进入自定义全屏模式出错: ' + e.message);
        }
    }

    // 退出自定义全屏模式
    function exitCustomFullscreen() {
        try {
            isCustomFullscreen = false;
            
            // 更新全屏按钮文本
            var fullscreenBtn = document.getElementById('fullscreenBtn');
            if (fullscreenBtn) {
                fullscreenBtn.innerHTML = '⛶';
                if (!supportsEmoji('⛶')) {
                    fullscreenBtn.innerHTML = '全屏';
                }
                fullscreenBtn.setAttribute('data-fullscreen', 'false');
            }
            
            // 移除全屏模式类，显示控制按钮
            document.body.classList.remove('fullscreen-mode');
            
            // 应用时钟位置，确保在退出全屏模式后保持一致
            applyClockPosition();
            
            // 移除额外的iOS全屏样式
            var style = document.getElementById('ios-fullscreen-style');
            if (style) {
                style.parentNode.removeChild(style);
            }
            
            logDebug('已退出自定义全屏模式');
        } catch(e) {
            logDebug('退出自定义全屏模式出错: ' + e.message);
        }
    }

    // 修改全屏按钮初始化函数
    function initFullscreenButton() {
        try {
            var fullscreenBtn = document.getElementById('fullscreenBtn');
            if (fullscreenBtn) {
                fullscreenBtn.innerHTML = '⛶';
                if (!supportsEmoji('⛶')) {
                    fullscreenBtn.innerHTML = '全屏';
                }
                fullscreenBtn.setAttribute('data-fullscreen', 'false');
                
                // 针对iOS设备优化触摸事件处理
                if (/iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())) {
                    // 对于iOS设备，使用touchend事件防止点击延迟
                    fullscreenBtn.addEventListener('touchend', function(e) {
                        e.preventDefault();
                        // 延迟50ms执行，避免事件冲突
                        setTimeout(function() {
                            toggleFullScreen();
                        }, 50);
                    });
                    
                    // 增加视觉反馈
                    fullscreenBtn.addEventListener('touchstart', function() {
                        this.style.opacity = '0.7';
                    });
                    
                    fullscreenBtn.addEventListener('touchend', function() {
                        this.style.opacity = '1';
                    });
                }
            }
        } catch(e) {
            logDebug('初始化全屏按钮出错: ' + e.message);
        }
    }

    // 修改handleFullscreenChange函数，加入自定义全屏模式检测
    function handleFullscreenChange() {
        try {
            // 如果是自定义全屏模式，浏览器事件不会影响它
            if (isCustomFullscreen) {
                return;
            }
            
            // 检查是否在全屏模式
            var isFullScreen = document.fullscreenElement || 
                document.mozFullScreenElement || 
                document.webkitFullscreenElement || 
                document.msFullscreenElement;
            
            logDebug('浏览器全屏状态变化: ' + (isFullScreen ? '已进入全屏' : '已退出全屏'));
            
            // 更新全屏按钮文本
            var fullscreenBtn = document.getElementById('fullscreenBtn');
            if (fullscreenBtn) {
                if (isFullScreen) {
                    fullscreenBtn.innerHTML = '⤓';
                    if (!supportsEmoji('⤓')) {
                        fullscreenBtn.innerHTML = '退出';
                    }
                    fullscreenBtn.setAttribute('data-fullscreen', 'true');
                } else {
                    fullscreenBtn.innerHTML = '⛶';
                    if (!supportsEmoji('⛶')) {
                        fullscreenBtn.innerHTML = '全屏';
                    }
                    fullscreenBtn.setAttribute('data-fullscreen', 'false');
                }
            }
            
            // 更新body类
            if (isFullScreen) {
                document.body.classList.add('fullscreen-mode');
            } else {
                document.body.classList.remove('fullscreen-mode');
            }
        } catch(e) {
            logDebug('处理全屏变化事件出错: ' + e.message);
        }
    }

    // 检查设备是否支持特定emoji
    function supportsEmoji(emoji) {
        try {
            // 创建一个canvas并尝试绘制emoji
            var canvas = document.createElement('canvas');
            canvas.width = 20;
            canvas.height = 20;
            var ctx = canvas.getContext('2d');
            ctx.font = '16px sans-serif';
            ctx.fillText(emoji, 0, 15);
            
            // 检查是否成功绘制了emoji
            var pixels = ctx.getImageData(0, 0, 20, 20).data;
            var hasColor = false;
            
            // 检查是否有非透明像素
            for (var i = 0; i < pixels.length; i += 4) {
                if (pixels[i+3] > 0) {
                    hasColor = true;
                    break;
                }
            }
            
            return hasColor;
        } catch(e) {
            logDebug('检查emoji支持出错: ' + e.message);
            return false;
        }
    }
    
    // 检查浏览器是否支持全屏API
    function supportsFullScreen() {
        return document.documentElement.requestFullscreen || 
               document.documentElement.mozRequestFullScreen || 
               document.documentElement.webkitRequestFullscreen || 
               document.documentElement.msRequestFullscreen;
    }

    // 添加Safari/iOS检测函数
    function isSafariOrIOS() {
        var ua = navigator.userAgent.toLowerCase();
        var isSafari = (ua.indexOf('safari') !== -1 && ua.indexOf('chrome') === -1);
        var isIOS = /iphone|ipad|ipod/.test(ua);
        return isSafari || isIOS;
    }

    // 应用时钟位置，确保不超出屏幕
    function applyClockPosition() {
        try {
            var clockElement = document.getElementById('clock');
            if (clockElement) {
                // 获取时钟和窗口的高度以计算可移动范围
                var clockHeight = clockElement.offsetHeight * currentScale;
                var windowHeight = window.innerHeight;
                
                // 计算时钟的顶部和底部位置
                var clockTop = (windowHeight - clockHeight) / 2 + clockPosition;
                var clockBottom = clockTop + clockHeight;
                
                // 确保至少有50%的时钟在屏幕内可见
                var minVisibleTop = -clockHeight * 0.5;
                var maxVisibleBottom = windowHeight + clockHeight * 0.5;
                
                // 如果时钟位置超出可视范围，进行调整
                if (clockTop < minVisibleTop) {
                    clockPosition += (minVisibleTop - clockTop);
                }
                if (clockBottom > maxVisibleBottom) {
                    clockPosition -= (clockBottom - maxVisibleBottom);
                }
                
                // 应用最终位置
                var positionStyle = 'translateY(' + clockPosition + 'px)';
                
                clockElement.style.webkitTransform = 'scale(' + currentScale + ') ' + positionStyle;
                clockElement.style.transform = 'scale(' + currentScale + ') ' + positionStyle;
                
                logDebug('应用时钟位置: ' + clockPosition + 'px, 时钟高度: ' + clockHeight + 'px, 窗口高度: ' + windowHeight + 'px');
            }
        } catch(e) {
            logDebug('应用时钟位置出错: ' + e.message);
        }
    }
    
    // 应用时间区域缩放比例
    function applyTimeScale() {
        try {
            var timeSection = document.getElementById('timeSection');
            if (timeSection) {
                timeSection.style.transform = 'scale(' + timeScale + ')';
                timeSection.style.webkitTransform = 'scale(' + timeScale + ')';
                logDebug('应用时间区域缩放: ' + timeScale);
            }
        } catch(e) {
            logDebug('应用时间区域缩放出错: ' + e.message);
        }
    }
    
    // 应用日期区域缩放比例
    function applyDateScale() {
        try {
            var dateElement = document.querySelector('.date');
            if (dateElement) {
                dateElement.style.transform = 'scale(' + dateScale + ')';
                dateElement.style.webkitTransform = 'scale(' + dateScale + ')';
                dateElement.style.transformOrigin = 'center center';
                dateElement.style.webkitTransformOrigin = 'center center';
                logDebug('应用日期区域缩放: ' + dateScale);
            }
        } catch(e) {
            logDebug('应用日期区域缩放出错: ' + e.message);
        }
    }
    
    // 添加重置时钟位置和大小功能 - 完全恢复到默认状态
    function resetClockPositionAndSize() {
        try {
            // 全屏模式下不执行重置
            if (isCustomFullscreen) {
                logDebug('全屏模式下不执行重置');
                return;
            }
            
            // 重置到默认值
            clockPosition = defaultClockPosition;
            dateScale = defaultDateScale;
            currentScale = defaultScale;
            
            // 应用新的设置
            applyClockPosition();
            applyDateScale();
            
            // 保存设置
            saveSettings();
            
            logDebug('重置时钟到默认状态');
            
            // 显示视觉反馈
            var clockElement = document.getElementById('clock');
            if (clockElement) {
                clockElement.classList.add('reset-feedback');
                setTimeout(function() {
                    clockElement.classList.remove('reset-feedback');
                }, 300);
            }
        } catch(e) {
            logDebug('重置时钟出错: ' + e.message);
        }
    }
    
    // 获取时间翻页卡片的宽度
    function getTimeCardWidth() {
        try {
            var timeSection = document.getElementById('timeSection');
            if (timeSection) {
                return timeSection.offsetWidth;
            }
            return 500; // 默认宽度，如果无法获取
        } catch(e) {
            logDebug('获取时间卡片宽度出错: ' + e.message);
            return 500; // 出错时返回默认宽度
        }
    }
    
    // 计算日期相对于时间卡片的缩放比例
    function calculateRelativeDateScale(scaleValue) {
        // 获取时间卡片宽度
        var timeCardWidth = getTimeCardWidth();
        
        // 计算日期元素的原始宽度（在缩放前）
        var dateElement = document.querySelector('.date');
        var dateWidth = dateElement ? dateElement.scrollWidth : 200; // 默认宽度
        
        // 计算当前日期宽度相对于时间卡片宽度的比例
        var currentRatio = (dateWidth * scaleValue) / timeCardWidth;
        
        // 显示调试信息
        logDebug('时间卡片宽度: ' + timeCardWidth + 'px, 日期宽度: ' + dateWidth + 'px, 当前比例: ' + currentRatio);
        
        return currentRatio;
    }
    
    // 初始化调整大小功能
    function initResizing() {
        try {
            var dateElement = document.querySelector('.date');
            var clockElement = document.getElementById('clock');
            
            if (!dateElement || !clockElement) return;
            
            // 保存默认值以供重置功能使用
            defaultClockPosition = 0;
            defaultTimeScale = 1;
            defaultDateScale = 1;
            defaultScale = 1;
            
            // 记住初始缩放比例
            initialDateScale = dateScale;
            
            // 只为日期区域添加调整大小把手
            var dateResizeHandle = document.createElement('div');
            dateResizeHandle.className = 'resize-handle date-resize-handle';
            dateResizeHandle.title = '左右拖动调整日期文字大小';
            dateElement.parentNode.insertBefore(dateResizeHandle, dateElement.nextSibling);
            
            // 移除可能存在的旧事件监听器
            clockElement.removeEventListener('dblclick', resetClockPositionAndSize);
            
            // 添加双击重置功能
            clockElement.addEventListener('dblclick', function dblClickHandler(e) {
                logDebug('检测到双击事件');
                
                // 全屏模式下不执行重置
                if (isCustomFullscreen) {
                    logDebug('全屏模式下不响应双击');
                    return;
                }
                
                // 如果点击的是调整大小把手，不应该触发重置
                if (e.target.classList.contains('resize-handle')) {
                    logDebug('双击在把手上，不执行重置');
                    return;
                }
                
                // 执行重置
                resetClockPositionAndSize();
                
                // 阻止默认行为和冒泡
                e.preventDefault();
                e.stopPropagation();
            });
            
            // 添加触摸双击支持
            var lastTap = 0;
            clockElement.addEventListener('touchend', function(e) {
                // 全屏模式下不执行重置
                if (isCustomFullscreen) {
                    return;
                }
                
                var currentTime = new Date().getTime();
                var tapLength = currentTime - lastTap;
                
                if (tapLength < 500 && tapLength > 0) {
                    logDebug('检测到触摸双击事件');
                    
                    // 如果点击的是调整大小把手，不应该触发重置
                    if (e.target.classList.contains('resize-handle')) {
                        return;
                    }
                    
                    // 执行重置
                    resetClockPositionAndSize();
                    
                    // 阻止默认行为
                    e.preventDefault();
                }
                
                lastTap = currentTime;
            });
            
            // 日期调整大小开始事件
            function handleDateResizeStart(e) {
                if (isCustomFullscreen) return; // 全屏模式下禁止调整大小
                
                isResizingDate = true;
                document.body.classList.add('resizing-date');
                
                // 获取起始位置和缩放
                resizeStartX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
                resizeStartScale = dateScale;
                
                // 阻止默认行为和冒泡
                e.preventDefault();
                e.stopPropagation();
            }
            
            // 调整大小移动事件
            function handleResizeMove(e) {
                if (!isResizingDate) return;
                
                // 计算移动距离
                var clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
                var deltaX = clientX - resizeStartX;
                
                // 调整比例因子 - 让缩放更精细
                var adjustmentFactor = 0.005;
                
                // 计算新的缩放值
                var newScale = resizeStartScale + deltaX * adjustmentFactor;
                
                // 获取时间卡片宽度
                var timeCardWidth = getTimeCardWidth();
                
                // 计算日期元素的原始宽度（在缩放前）
                var originalDateWidth = dateElement ? dateElement.scrollWidth : 200;
                
                // 计算缩放后的日期宽度
                var scaledDateWidth = originalDateWidth * newScale;
                
                // 计算相对于时间卡片宽度的比例
                var relativeDateWidth = scaledDateWidth / timeCardWidth;
                
                // 限制日期宽度在时间卡片宽度的30%～120%范围内
                if (relativeDateWidth < 0.3) {
                    newScale = (0.3 * timeCardWidth) / originalDateWidth;
                } else if (relativeDateWidth > 1.2) {
                    newScale = (1.2 * timeCardWidth) / originalDateWidth;
                }
                
                // 更新日期缩放比例
                dateScale = newScale;
                applyDateScale();
                
                // 阻止默认行为和冒泡
                e.preventDefault();
                e.stopPropagation();
            }
            
            // 调整大小结束事件
            function handleResizeEnd(e) {
                if (!isResizingDate) return;
                
                isResizingDate = false;
                document.body.classList.remove('resizing-date');
                
                // 打印当前日期相对时间卡片的比例
                var relativeScale = calculateRelativeDateScale(dateScale);
                logDebug('日期调整结束 - 相对时间卡片比例: ' + relativeScale);
                
                // 保存新设置
                saveSettings();
                
                // 阻止默认行为和冒泡
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
            
            // 添加事件监听 - 日期区域
            dateResizeHandle.addEventListener('mousedown', handleDateResizeStart);
            dateResizeHandle.addEventListener('touchstart', handleDateResizeStart, { passive: false });
            
            // 添加文档级事件监听
            document.addEventListener('mousemove', handleResizeMove);
            document.addEventListener('touchmove', handleResizeMove, { passive: false });
            document.addEventListener('mouseup', handleResizeEnd);
            document.addEventListener('touchend', handleResizeEnd);
            document.addEventListener('mouseleave', handleResizeEnd);
            
            // 应用初始日期缩放
            applyDateScale();
            
            // 打印初始日期相对时间卡片的比例
            var initialRelativeScale = calculateRelativeDateScale(dateScale);
            logDebug('初始日期相对时间卡片比例: ' + initialRelativeScale);
            
            logDebug('日期调整大小功能已初始化');
        } catch(e) {
            logDebug('初始化调整大小功能出错: ' + e.message);
        }
    }
    
    // 修改初始化拖动功能，确保不超出屏幕
    function initDragClock() {
        try {
            var clockElement = document.getElementById('clock');
            if (!clockElement) return;
            
            // 鼠标/触摸开始事件
            function handleDragStart(e) {
                // 如果点击的是调整大小把手，不应该开始拖动
                if (e.target.classList.contains('resize-handle')) return;
                
                if (isCustomFullscreen) return; // 全屏模式下禁止拖动
                
                isDragging = true;
                clockElement.classList.add('dragging');
                
                // 获取起始位置
                dragStartY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
                dragStartPosition = clockPosition;
                
                // 阻止默认行为和冒泡
                e.preventDefault();
                e.stopPropagation();
            }
            
            // 鼠标/触摸移动事件
            function handleDragMove(e) {
                if (!isDragging) return;
                
                // 计算移动距离
                var clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
                var deltaY = clientY - dragStartY;
                
                // 更新位置
                clockPosition = dragStartPosition + deltaY;
                
                // 获取窗口高度和时钟高度
                var windowHeight = window.innerHeight;
                var clockHeight = clockElement.offsetHeight * currentScale;
                
                // 限制位置，确保时钟至少有50%在可视区域内
                var maxTop = windowHeight / 2 - clockHeight * 0.25; // 允许1/4在顶部外
                var minTop = -windowHeight / 2 + clockHeight * 0.25; // 允许1/4在底部外
                
                // 应用限制
                clockPosition = Math.min(maxTop, Math.max(minTop, clockPosition));
                
                // 应用位置并确保不超出屏幕
                applyClockPosition();
                
                // 阻止默认行为和冒泡
                e.preventDefault();
                e.stopPropagation();
            }
            
            // 鼠标/触摸结束事件
            function handleDragEnd(e) {
                if (!isDragging) return;
                
                isDragging = false;
                clockElement.classList.remove('dragging');
                
                // 保存新位置
                saveSettings();
                
                // 阻止默认行为和冒泡
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
            
            // 添加事件监听
            clockElement.addEventListener('mousedown', handleDragStart);
            document.addEventListener('mousemove', handleDragMove);
            document.addEventListener('mouseup', handleDragEnd);
            
            // 触摸事件支持
            clockElement.addEventListener('touchstart', handleDragStart, { passive: false });
            document.addEventListener('touchmove', handleDragMove, { passive: false });
            document.addEventListener('touchend', handleDragEnd);
            
            // 处理用户离开页面的情况
            document.addEventListener('mouseleave', handleDragEnd);
            
            logDebug('时钟拖动功能已初始化');
        } catch(e) {
            logDebug('初始化拖动功能出错: ' + e.message);
        }
    }
    
    // 初始化
    function init() {
        try {
            logDebug('初始化时钟...');
            
            // 从localStorage加载设置
            loadSettings();
            
            // 预初始化钟声音频
            initBellSounds();
            
            // 初始化拖动功能
            initDragClock();
            
            // 初始化调整大小功能
            initResizing();
            
            // 设置初始时间
            updateClock(); 
            updateDate();
            
            // 每秒更新时间
            setInterval(updateClock, 1000);
            // 每秒更新日期
            setInterval(updateDate, 1000);

            // 初始化全屏按钮文本
            initFullscreenButton();
            
            // 添加全屏变化事件监听器
            document.addEventListener('fullscreenchange', handleFullscreenChange);
            document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.addEventListener('mozfullscreenchange', handleFullscreenChange);
            document.addEventListener('MSFullscreenChange', handleFullscreenChange);

            // 绑定按钮事件
            var fullscreenBtn = document.getElementById('fullscreenBtn');
            var toggleSecondsBtn = document.getElementById('toggleSecondsBtn');
            var zoomInBtn = document.getElementById('zoomInBtn');
            var zoomOutBtn = document.getElementById('zoomOutBtn');
            var toggleBellBtn = document.getElementById('toggleBellBtn');
            var themeToggleBtn = document.getElementById('themeToggleBtn');
            
            // 报时设置相关按钮
            var saveBellSettingsBtn = document.getElementById('saveBellSettings');
            var cancelBellSettingsBtn = document.getElementById('cancelBellSettings');
            var selectAllHoursBtn = document.getElementById('selectAllHours');
            var selectBusinessHoursBtn = document.getElementById('selectBusinessHours');
            var selectNoneBtn = document.getElementById('selectNone');
            var testBellBtn = document.getElementById('testBellButton');

            if (fullscreenBtn) {
                fullscreenBtn.onclick = toggleFullScreen;
                logDebug('全屏按钮已绑定');
            }
            if (toggleSecondsBtn) {
                toggleSecondsBtn.onclick = toggleSeconds;
                logDebug('切换秒按钮已绑定');
            }
            if (zoomInBtn) {
                zoomInBtn.onclick = zoomIn;
                logDebug('放大按钮已绑定');
            }
            if (zoomOutBtn) {
                zoomOutBtn.onclick = zoomOut;
                logDebug('缩小按钮已绑定');
            }
            if (toggleBellBtn) {
                toggleBellBtn.onclick = toggleHourlyBell;
                logDebug('整点报时按钮已绑定');
            }
            if (themeToggleBtn) {
                themeToggleBtn.onclick = toggleTheme;
                logDebug('主题切换按钮已绑定');
            }
            
            // 绑定报时设置相关按钮
            if (saveBellSettingsBtn) {
                saveBellSettingsBtn.onclick = saveBellSettings;
                logDebug('保存报时设置按钮已绑定');
            }
            if (cancelBellSettingsBtn) {
                cancelBellSettingsBtn.onclick = cancelBellSettings;
                logDebug('取消报时设置按钮已绑定');
            }
            if (selectAllHoursBtn) {
                selectAllHoursBtn.onclick = selectAllHours;
                logDebug('全选按钮已绑定');
            }
            if (selectBusinessHoursBtn) {
                selectBusinessHoursBtn.onclick = selectBusinessHours;
                logDebug('工作时间按钮已绑定');
            }
            if (selectNoneBtn) {
                selectNoneBtn.onclick = selectNone;
                logDebug('清除按钮已绑定');
            }
            if (testBellBtn) {
                testBellBtn.onclick = testHourlyBell;
                logDebug('试听按钮已绑定');
            }
            
            // 监听全屏变化事件
            document.addEventListener('fullscreenchange', handleFullscreenChange);
            document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.addEventListener('mozfullscreenchange', handleFullscreenChange);
            document.addEventListener('MSFullscreenChange', handleFullscreenChange);
            
            // 应用初始缩放
            setScale(currentScale);
            logDebug('初始化完成');

            // 绑定多次敲钟复选框的变更事件
            var multiBellCheckbox = document.getElementById('multiBellCheckbox');
            if (multiBellCheckbox) {
                multiBellCheckbox.onchange = saveSettings;
            }
            
            // iOS音频兼容性处理
            document.addEventListener('touchstart', function() {
                if (!bellSoundsLoaded) {
                    initBellSounds();
                }
                // 在用户第一次触摸屏幕时加载一次音频（静音播放）
                for (var i = 0; i < bellSounds.length; i++) {
                    var silentSound = bellSounds[i];
                    if (silentSound) {
                        silentSound.volume = 0.01;
                        silentSound.play().then(function() {
                            silentSound.pause();
                            silentSound.currentTime = 0;
                            silentSound.volume = 1.0;
                            logDebug('iOS音频解锁成功');
                        }).catch(function(e) {
                            logDebug('iOS音频解锁失败: ' + e);
                        });
                    }
                }
            }, {once: true});

            document.addEventListener('click', function() {
                if (!bellSoundsLoaded) {
                    initBellSounds();
                }
                // 在用户第一次触摸屏幕时加载一次音频（静音播放）
                for (var i = 0; i < bellSounds.length; i++) {
                    var silentSound = bellSounds[i];
                    if (silentSound) {
                        silentSound.volume = 0.01;
                        silentSound.play().then(function() {
                            silentSound.pause();
                            silentSound.currentTime = 0;
                            silentSound.volume = 1.0;
                            logDebug('iOS音频解锁成功');
                        }).catch(function(e) {
                            logDebug('iOS音频解锁失败: ' + e);
                        });
                    }
                }
            }, {once: true});
            
        } catch(e) {
            logDebug('初始化时钟出错: ' + e.message);
        }
    }
    
    // 页面加载完成后初始化
    if (document.addEventListener) {
        // 检测浏览器是否支持DOMContentLoaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            logDebug('DOMContentLoaded事件已注册');
        } else {
            // 已经加载完成
            init();
            logDebug('页面已加载，直接初始化');
        }
    } else {
        // 兼容旧浏览器
        window.onload = init;
        logDebug('使用window.onload事件');
    }
})();