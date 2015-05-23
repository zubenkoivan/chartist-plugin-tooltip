(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([], function () {
      return (root.returnExportsGlobal = factory());
    });
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like enviroments that support module.exports,
    // like Node.
    module.exports = factory();
  } else {
    root['Chartist.plugins.lineTooltip'] = factory();
  }
}(this, function () {

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

    var Tooltip = function (chart, chartRect, coords, options) {

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

      var group = function (values) {

        var groups = {};

        return values
          .map(function (value, i) {
            return {
              groupName: getGroupName(i),
              className: getClassName(i),
              text: value
            };
          })
          .filter(function (group) {
            if (group.text !== undefined && group.text !== null && group.text !== '') {
              groups[group.groupName] = groups[group.groupName] || [];
              return true;
            }
            return false;
          })
          .reduce(function (result, group) {
            if (groups[group.groupName].indexOf(group.text) === -1) {
              groups[group.groupName].push(group.text);
              result.push(group);
            }
            return result;
          }, []);
      };

      var staticHtmlStart = '<div class="' + options.classNames.series + ' ';
      var staticHtmlMiddle = '"><svg class="' + options.classNames.series + '-label"><line x1="0" x2="100%" y1="50%" y2="50%" class="label-line"></line></svg><div class="value">';
      var staticHtmlEnd = '</div></div>';

      var tooltipHtml = function (header, values) {

        var html = '<div class="' + options.classNames.tooltip + '-header">' + (header || '') + '</div>';

        values = group(values);

        return values.reduce(function (prev, value) {
          return prev + staticHtmlStart + value.className + staticHtmlMiddle + value.text + staticHtmlEnd;
        }, html);
      };

      var getTooltipOffset = function (left) {
        return {
          left: left,
          top: chartRect.height() / 2 - $tooltip.outerHeight() / 2
        };
      };

      this.hide = function () {
        $tooltip.hide();
      };

      this.show = function (index, header, values) {
        $tooltip
          .html(tooltipHtml(header, values))
          .css(getTooltipOffset(coords[index]))
          .show();
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
          tooltip = new Tooltip(chart, data.chartRect, coords, options);
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

          var values = series.map(function (x, i) {
            return options.formatValue(x[index], i);
          });

          tooltip.show(index, options.formatHeader(labels[index], index), values);
        });
      };
    };

  } (window, document, Chartist));

  return Chartist.plugins.lineTooltip;

}));
