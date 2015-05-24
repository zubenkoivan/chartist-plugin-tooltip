/**
 * Chartist.js plugin to add tooltip in a line chart.
 *
 */
/* global Chartist */
(function (window, document, Chartist) {
  'use strict';

  var defaultOptions = {
    formatHeader: Chartist.noop,
    formatValue: Chartist.noop,
    cursorLabel: undefined,
    classNames: {
      tooltip: 'tooltip',
      series: 'series',
      cursor: 'cursor'
    }
  };

  var Tooltip = function (chart, chartRect, coords, options, labels, series) {

    var $tooltip = $('.' + options.classNames.tooltip, chart.container);

    if (!$tooltip.length) {
      $tooltip = $('<div class="' + options.classNames.tooltip + '"></div>').appendTo(chart.container);
    }

    $tooltip.hide();
    
    var getGroupName = function (index) {
      return chart.data.series[index].groupName || Chartist.alphaNumerate(index);
    };
    
    var getClassName = function (index) {
      return chart.data.series[index].className || (options.classNames.series + '-' + Chartist.alphaNumerate(index));
    };

    var getGroupedValues = function (index) {
      
      var groups = {};

      return series
        .map(function (data, i) {
          return {
            groupName: getGroupName(i),
            className: getClassName(i),
            text: options.formatValue(data[index], i)
          };
        })
        .filter(function (group) {
          return group.text !== undefined && group.text !== null && group.text !== '';
        })
        .reduce(function (result, group) {
          
          var texts = groups[group.groupName] || (groups[group.groupName] = []);
          
          if (texts.indexOf(group.text) === -1) {
            texts.push(group.text);
            result.push(group);
          }
          return result;
        }, []);
    };
    
    var cache = {};

    var tooltipHtml = function (index) {
      
      var header = options.formatHeader(labels[index], index);
      var values = getGroupedValues(index);

      var html = '<div class="' + options.classNames.tooltip + '-header">' + (header || '') + '</div>';

      return values.reduce(function (prev, value) {
        return prev + '<div class="' + options.classNames.series + ' ' + value.className + '">' +
          '<svg class="' + options.classNames.series + '-label"><line x1="0" x2="100%" y1="50%" y2="50%" class="label-line"></line></svg>' +
          '<div class="value">' + value.text + '</div></div>';
      }, html);
    };

    var getTooltipOffset = function (index) {
      return {
        left: coords[index],
        top: chartRect.height() / 2 - $tooltip.outerHeight() / 2
      };
    };
    
    var getTooltip = function (index) {
      return cache[index] || (cache[index] = {
        html: tooltipHtml(index),
        offset: getTooltipOffset(index)
      });
    };

    this.show = function (index) {
      
      var tooltip = getTooltip(index);
      
      $tooltip
        .html(tooltip.html)
        .css(tooltip.offset)
        .show();
    };

    this.hide = function () {
      $tooltip.hide();
    };
  };

  var Cursor = function (chart, chartRect, coords, options) {

    var cursor = chart.svg.elem('line', {}, options.classNames.cursor);

    var $label = $('.' + options.classNames.cursor + '-label', chart.container);

    if (!$label.length) {
      $label = $('<span class="' + options.classNames.cursor + '-label" style="position: absolute"></span>')
        .html(options.cursorLabel || '')
        .appendTo(chart.container);
    }

    $label
      .hide()
      .css('top', chart.options.chartPadding.top - $label.outerHeight());

    var halfLabelWidth = $label.width() / 2;

    var showLabel = function (x) {
      $label
        .css('left', x - halfLabelWidth)
        .show();
    };

    this.hide = function () {
      cursor.attr({ style: 'display: none' });
      $label.hide();
    };

    this.show = function (index) {

      var x = coords[index];

      showLabel(x);

      cursor.attr({
        x1: x,
        x2: x,
        y1: chartRect.y1,
        y2: chartRect.y2,
        style: ''
      });
    };
  };

  var IndexTracker = function (coords) {

    var index = -1;

    var binarySearch = function (value, start, end, minDistanceIndex) {

      if (start === undefined) {
        start = 0;
      }
      if (end === undefined) {
        end = coords.length - 1;
      }

      if (start > end) {
        return minDistanceIndex;
      }

      var middle = Math.floor((start + end) / 2);
      var distance = Math.abs(value - coords[middle]);

      if (distance === 0) {
        return middle;
      }

      if (minDistanceIndex === undefined || distance < Math.abs(value - coords[minDistanceIndex])) {
        minDistanceIndex = middle;
      }

      if (value < coords[middle]) {
        return binarySearch(value, start, middle - 1, minDistanceIndex);
      } else {
        return binarySearch(value, middle + 1, end, minDistanceIndex);
      }
    };

    this.get = function () {
      return index;
    };

    this.reset = function () {
      index = -1;
    };

    this.set = function (x) {
      
      var newIndex = binarySearch(x);

      if (index === newIndex) {
        return false;
      }

      index = newIndex;

      return true;
    };
  };

  Chartist.plugins = Chartist.plugins || {};
  Chartist.plugins.lineTooltip = function (options) {

    options = Chartist.extend({}, defaultOptions, options);

    return function (chart) {

      if (!(chart instanceof Chartist.Line)) {
        return;
      }

      var series,
        labels,
        coords;

      var tooltip,
        cursor,
        indexTracker;

      chart.on('data', function (event) {
        labels = event.data.labels;
        coords = new Array(labels.length);
        series = new Array(event.data.series.length);
      });

      chart.on('draw', function (data) {

        if (data.type === 'line') {
          series[data.index] = data.values;
        }

        if (data.type === 'point') {
          coords[data.index] = data.x;
        }
      });

      chart.on('created', function (data) {
        indexTracker = new IndexTracker(coords);
        tooltip = new Tooltip(chart, data.chartRect, coords, options, labels, series);
        cursor = new Cursor(chart, data.chartRect, coords, options);
      });

      $(chart.container).on('mouseleave', function () {
        indexTracker.reset();
        tooltip.hide();
        cursor.hide();
      });

      $(chart.container).on('mousemove', '.' + chart.options.classNames.chart, function (event) {

        if (event.target.tagName.toLowerCase() !== 'svg') {
          return;
        }

        var offsetX = event.offsetX || event.originalEvent.layerX;

        if (!indexTracker.set(offsetX)) {
          return;
        }

        var index = indexTracker.get();
        cursor.show(index);
        tooltip.show(index);
      });
    };
  };

} (window, document, Chartist));
