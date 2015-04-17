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
    hideCursorPosition: Chartist.noop,
    cursorHeader: Chartist.noop
  };

  var Tooltip = function (chart, chartRect, coords) {

    var $tooltip = $('.ct-tooltip', chart.container);

    if (!$tooltip.length)
      $tooltip = $('<div class="ct-tooltip"></div>').appendTo(chart.container);

    $tooltip.hide();

    var tooltipHtml = function (header, values) {

      var html = '<div class="header">' + (header || '') + '</div>';

      return values.reduce(function (prev, value, i) {
        return prev + '<div class="series series-' + Chartist.alphaNumerate(i) + '">' +
          '<svg class="series-label"><line x1="0" x2="100%" y1="50%" y2="50%" class="label-line"></line></svg>' +
          '<div class="value">' + value + '</div></div>';
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

  var Cursor = function (chart, chartRect, coords) {

    var cursor = chart.svg.elem('line', {}, 'cursor');

    var $header = $('.cursor-header', chart.container);

    if (!$header.length)
      $header = $('<span class="cursor-header" style="position: absolute"></span>').appendTo(chart.container);

    $header.hide();

    var showHeader = function (x, headerHtml) {
      $header
        .html(headerHtml)
        .css({ top: 0, left: x - $header.width() / 2 })
        .show();
    };

    this.hide = function () {
      cursor.attr({ style: 'display: none' });
      $header.hide();
    };

    this.show = function (index, headerHtml) {

      var x = coords[index];

      showHeader(x, headerHtml);

      cursor.attr({
        x1: x,
        x2: x,
        y1: chartRect.y1,
        y2: chartRect.y2 + $header.height(),
        style: ''
      });
    };
  };

  var IndexTracker = function (coords) {

    var index = -1;

    var binarySearch = function (value, start, end, minDistanceIndex) {

      if (start === undefined) start = 0;
      if (end === undefined) end = coords.length - 1;

      if (start > end) return minDistanceIndex;

      var middle = Math.floor((start + end) / 2);
      var distance = Math.abs(value - coords[middle]);

      if (distance === 0) return middle;

      if (minDistanceIndex === undefined || distance < Math.abs(value - coords[minDistanceIndex]))
        minDistanceIndex = middle;

      if (value < coords[middle])
        return binarySearch(value, start, middle - 1, minDistanceIndex);
      else
        return binarySearch(value, middle + 1, end, minDistanceIndex);
    };

    this.get = function () {
      return index;
    };

    this.reset = function () {
      index = -1;
    };

    this.set = function (x) {

      var newIndex = binarySearch(x);

      if (index === newIndex)
        return false;

      index = newIndex;

      return true;
    };
  };

  Chartist.plugins = Chartist.plugins || {};
  Chartist.plugins.ctTooltip = function (options) {

    options = Chartist.extend({}, defaultOptions, options);

    return function (chart) {

      if (!(chart instanceof Chartist.Line))
        return;

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

        if (data.type === 'line')
          series[data.index] = data.values;

        if (data.type === 'point')
          coords[data.index] = data.x;
      });

      chart.on('created', function (data) {
        indexTracker = new IndexTracker(coords);
        tooltip = new Tooltip(chart, data.chartRect, coords);
        cursor = new Cursor(chart, data.chartRect, coords);
      });

      $(chart.container).on('mouseleave', function () {
        indexTracker.reset();
        tooltip.hide();
        cursor.hide();
      });

      $(chart.container).on('mousemove', '.' + chart.options.classNames.chart, function (event) {

        if (event.target.tagName.toLowerCase() !== 'svg') return;

        var offsetX = event.offsetX || event.originalEvent.layerX;

        if (!indexTracker.set(offsetX))
          return;

        var index = indexTracker.get();

        if (options.hideCursorPosition() === labels[index])
          cursor.hide();
        else
          cursor.show(index, options.cursorHeader());

        var values = series.map(function (x, i) {
          return options.formatValue(x[index], i);
        });

        tooltip.show(index, options.formatHeader(labels[index], index), values);
      });
    };
  };

}(window, document, Chartist));
