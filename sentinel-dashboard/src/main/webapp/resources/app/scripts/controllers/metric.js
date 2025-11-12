var app = angular.module('sentinelDashboardApp');

app.controller('MetricCtl', ['$scope', '$stateParams', 'MetricService', '$interval', '$timeout',
  function ($scope, $stateParams, MetricService, $interval, $timeout) {
	$scope.charts = [];
    $scope.endTime = new Date();
    $scope.startTime = new Date();
    $scope.startTime.setMinutes($scope.endTime.getMinutes() - 30);
    $scope.startTimeFmt = formatDate($scope.startTime);
    $scope.endTimeFmt = formatDate($scope.endTime);
    function formatDate(date) {
      // return moment(date).format('YYYY/MM/DD HH:mm:ss');
        const year = date.getFullYear();
        // 月份从0开始，需要+1
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
      // 校验函数
      function validateDateTime(input) {
          // 正则表达式匹配格式 yyyy-MM-dd HH:mm:ss
          const regex = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
          const match = input.match(regex);

          if (!match) {
              return {
                  isValid: false,
                  message: '格式不正确，请使用 yyyy-MM-dd HH:mm:ss 格式'
              };
          }

          // 提取日期时间组件
          const year = parseInt(match[1], 10);
          const month = parseInt(match[2], 10);
          const day = parseInt(match[3], 10);
          const hour = parseInt(match[4], 10);
          const minute = parseInt(match[5], 10);
          const second = parseInt(match[6], 10);

          // 验证月份
          if (month < 1 || month > 12) {
              return {
                  isValid: false,
                  message: '月份必须在 01-12 之间'
              };
          }

          // 验证日期
          const daysInMonth = new Date(year, month, 0).getDate();
          if (day < 1 || day > daysInMonth) {
              return {
                  isValid: false,
                  message: `日期无效，${year}年${month}月只有${daysInMonth}天`
              };
          }

          // 验证小时
          if (hour < 0 || hour > 23) {
              return {
                  isValid: false,
                  message: '小时必须在 00-23 之间'
              };
          }

          // 验证分钟
          if (minute < 0 || minute > 59) {
              return {
                  isValid: false,
                  message: '分钟必须在 00-59 之间'
              };
          }

          // 验证秒钟
          if (second < 0 || second > 59) {
              return {
                  isValid: false,
                  message: '秒钟必须在 00-59 之间'
              };
          }

          // 检查是否为有效日期（处理闰年等情况）
          const date = new Date(year, month - 1, day, hour, minute, second);
          if (date.getFullYear() !== year ||
              date.getMonth() + 1 !== month ||
              date.getDate() !== day ||
              date.getHours() !== hour ||
              date.getMinutes() !== minute ||
              date.getSeconds() !== second) {
              return {
                  isValid: false,
                  message: '无效的日期时间'
              };
          }

          return {
              isValid: true,
              message: '日期时间格式正确！',
          };
      }

    $scope.changeStartTime = function () {
      // $scope.startTimeFmt = formatDate(startTime);
      var validateResult = validateDateTime($scope.startTimeFmt);
      if (!validateResult.isValid) {
        alert(validateResult.message);
        $scope.startTimeFmt = formatDate($scope.startTime);
        return;
      }
      $scope.startTime = new Date($scope.startTimeFmt);
      reInitIdentityDatas();
    };
    $scope.changeEndTime = function (endTime) {
      // $scope.endTime = new Date(endTime);
      var validateResult = validateDateTime($scope.endTimeFmt);
      if (!validateResult.isValid) {
        alert(validateResult.message);
        $scope.endTimeFmt = formatDate($scope.endTime);
        return;
      }
      $scope.endTime = new Date($scope.endTimeFmt);
      reInitIdentityDatas();
    };
    $scope.handleStartTimeKeyPress = function ($event) {
      if ($event.which === 13) {
        $scope.changeStartTime($scope.startTimeFmt);
      }
    };
    $scope.handleEndTimeKeyPress = function ($event) {
      if ($event.which === 13) {
        $scope.changeEndTime($scope.endTimeFmt);
      }
    };

    $scope.app = $stateParams.app;
    // 数据自动刷新频率
    var DATA_REFRESH_INTERVAL = 1000 * 10;

    $scope.servicePageConfig = {
      pageSize: 6,
      currentPageIndex: 1,
      totalPage: 1,
      totalCount: 0,
    };
    $scope.servicesChartConfigs = [];

    $scope.pageChanged = function (newPageNumber) {
      $scope.servicePageConfig.currentPageIndex = newPageNumber;
      reInitIdentityDatas();
    };

    var searchT;
    $scope.searchService = function () {
      $timeout.cancel(searchT);
      searchT = $timeout(function () {
        reInitIdentityDatas();
      }, 600);
    }

    var intervalId;
    reInitIdentityDatas();
    function reInitIdentityDatas() {
      if ($scope.endTime.getTime()-$scope.startTime.getTime()>1000*60*60) {
        alert('时间范围不能超过1小时');
        return;
      }

      $interval.cancel(intervalId);
      queryIdentityDatas();
      intervalId = $interval(function () {
        queryIdentityDatas();
      }, DATA_REFRESH_INTERVAL);
    };

    $scope.$on('$destroy', function () {
      $interval.cancel(intervalId);
    });
    $scope.initAllChart = function () {
      //revoke useless charts positively
      while($scope.charts.length > 0) {
      	let chart = $scope.charts.pop();
      	chart.destroy();
      }
      $.each($scope.metrics, function (idx, metric) {
        if (idx == $scope.metrics.length - 1) {
          return;
        }
        const chart = new G2.Chart({
          container: 'chart' + idx,
          forceFit: true,
          width: 100,
          height: 250,
          padding: [10, 30, 70, 50]
        });
        $scope.charts.push(chart);
        var maxQps = 0;
        for (var i in metric.data) {
          var item = metric.data[i];
          if (item.passQps > maxQps) {
            maxQps = item.passQps;
          }
          if (item.blockQps > maxQps) {
            maxQps = item.blockQps;
          }
        }
        chart.source(metric.data);
        chart.scale('timestamp', {
          type: 'time',
          mask: 'YYYY-MM-DD HH:mm:ss'
        });
        chart.scale('passQps', {
          min: 0,
          max: maxQps,
          fine: true,
          alias: '通过 QPS'
          // max: 10
        });
        chart.scale('blockQps', {
          min: 0,
          max: maxQps,
          fine: true,
          alias: '拒绝 QPS',
        });
        chart.scale('rt', {
          min: 0,
          fine: true,
        });
        chart.axis('rt', {
          grid: null,
          label: null
        });
        chart.axis('blockQps', {
          grid: null,
          label: null
        });

        chart.axis('timestamp', {
          label: {
            textStyle: {
              textAlign: 'center', // 文本对齐方向，可取值为： start center end
              fill: '#404040', // 文本的颜色
              fontSize: '11', // 文本大小
              //textBaseline: 'top', // 文本基准线，可取 top middle bottom，默认为middle
            },
            autoRotate: false,
            formatter: function (text, item, index) {
              return text.substring(11, 11 + 5);
            }
          }
        });
        chart.legend({
          custom: true,
          position: 'bottom',
          allowAllCanceled: true,
          itemFormatter: function (val) {
            if ('passQps' === val) {
              return '通过 QPS';
            }
            if ('blockQps' === val) {
              return '拒绝 QPS';
            }
            return val;
          },
          items: [
            { value: 'passQps', marker: { symbol: 'hyphen', stroke: 'green', radius: 5, lineWidth: 2 } },
            { value: 'blockQps', marker: { symbol: 'hyphen', stroke: 'blue', radius: 5, lineWidth: 2 } },
            //{ value: 'rt', marker: {symbol: 'hyphen', stroke: 'gray', radius: 5, lineWidth: 2} },
          ],
          onClick: function (ev) {
            const item = ev.item;
            const value = item.value;
            const checked = ev.checked;
            const geoms = chart.getAllGeoms();
            for (var i = 0; i < geoms.length; i++) {
              const geom = geoms[i];
              if (geom.getYScale().field === value) {
                if (checked) {
                  geom.show();
                } else {
                  geom.hide();
                }
              }
            }
          }
        });
        chart.line().position('timestamp*passQps').size(1).color('green').shape('smooth');
        chart.line().position('timestamp*blockQps').size(1).color('blue').shape('smooth');
        //chart.line().position('timestamp*rt').size(1).color('gray').shape('smooth');
        G2.track(false);
        chart.render();
      });
    };

    $scope.metrics = [];
    $scope.emptyObjs = [];
    function queryIdentityDatas() {
      var params = {
        app: $scope.app,
        pageIndex: $scope.servicePageConfig.currentPageIndex,
        pageSize: $scope.servicePageConfig.pageSize,
        desc: $scope.isDescOrder,
        startTime: $scope.startTime.getTime(),
        endTime: $scope.endTime.getTime(),
        searchKey: $scope.serviceQuery
      };
      MetricService.queryAppSortedIdentities(params).success(function (data) {
        $scope.metrics = [];
        $scope.emptyObjs = [];
        if (data.code === 0 && data.data) {
          var metricsObj = data.data.metric;
          var identityNames = Object.keys(metricsObj);
          if (identityNames.length < 1) {
            $scope.emptyServices = true;
          } else {
            $scope.emptyServices = false;
          }
          $scope.servicePageConfig.totalPage = data.data.totalPage;
          $scope.servicePageConfig.pageSize = data.data.pageSize;
          var totalCount = data.data.totalCount;
          $scope.servicePageConfig.totalCount = totalCount;
          for (i = 0; i < totalCount; i++) {
            $scope.emptyObjs.push({});
          }
          $.each(identityNames, function (idx, identityName) {
            var identityDatas = metricsObj[identityName];
            var metrics = {};
            metrics.resource = identityName;
            // metrics.data = identityDatas;
            metrics.data = fillZeros(identityDatas);
            metrics.shortData = lastOfArray(identityDatas, 6);
            $scope.metrics.push(metrics);
          });
          // push an empty element in the last, for ng-init reasons.
          $scope.metrics.push([]);
        } else {
          $scope.emptyServices = true;
          console.log(data.msg);
        }
      });
    };
    function fillZeros(metricData) {
      if (!metricData || metricData.length == 0) {
        return [];
      }
      var filledData = [];
      filledData.push(metricData[0]);
      var lastTime = metricData[0].timestamp / 1000;
      for (var i = 1; i < metricData.length; i++) {
        var curTime = metricData[i].timestamp / 1000;
        if (curTime > lastTime + 1) {
          for (var j = lastTime + 1; j < curTime; j++) {
            filledData.push({
                "timestamp": j * 1000,
                "passQps": 0,
                "blockQps": 0,
                "successQps": 0,
                "exception": 0,
                "rt": 0,
                "count": 0
            })
          }
        }
        filledData.push(metricData[i]);
        lastTime = curTime;
      }
      return filledData;
    }
    function lastOfArray(arr, n) {
      if (!arr.length) {
        return [];
      }
      var rs = [];
      for (i = 0; i < n && i < arr.length; i++) {
        rs.push(arr[arr.length - 1 - i]);
      }
      return rs;
    }

    $scope.isDescOrder = true;
    $scope.setDescOrder = function () {
      $scope.isDescOrder = true;
      reInitIdentityDatas();
    }
    $scope.setAscOrder = function () {
      $scope.isDescOrder = false;
      reInitIdentityDatas();
    }
  }]);
