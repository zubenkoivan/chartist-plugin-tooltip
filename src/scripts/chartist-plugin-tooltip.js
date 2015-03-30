/**
 * Chartist.js plugin to add tooltip in a line chart.
 *
 */
/* global Chartist */
(function(window, document, Chartist) {
  'use strict';

  var defaultOptions = {
    removePoints: true
  };

  var $tooltip = $('<div class="ct-tooltip"></div>').hide();

  var binarySearch = function (arr, value, precision, start, end) {

    if (start === undefined) start = 0;
    if (end === undefined) end = arr.length - 1;

    if (start > end) return -1;

    var middle = Math.floor((start + end) / 2);

    if (Math.abs(arr[middle] - value) < precision)
      return middle;
    else if (value < arr[middle])
      return binarySearch(arr, value, precision, start, middle - 1);
    else
      return binarySearch(arr, value, precision, middle + 1, end);
  };

  var tooltipHtml = function (header, values) {

    var html = '<div class="ct-header">' + (header || '') + 
               '</div><ul class="ct-values">';

    values.forEach(function (value, i) {
      html += '<li class="ct-value">' + 
              '<div class="ct-label ct-label-' + Chartist.alphaNumerate(i) + '"></div>' +
              value +
              '</li>';
    });

    return html + '</ul>'
  };

  var getValues = function (series, index) {
    return series.map(function (x) { 
      return x[index];
    });
  };

  var getTooltipOffset = function (left, top) {

    var tooltipHeight = $tooltip.outerHeight();

    return {
      left: left + 10,
      top: top < tooltipHeight ? top : (top - tooltipHeight)
    };
  };

  var showTooltip = function (header, values, offset) {
    $tooltip
      .html(tooltipHtml(header, values))
      .css(offset)
      .show();
  };

  Chartist.plugins = Chartist.plugins || {};
  Chartist.plugins.ctTooltip = function(options) {

    options = Chartist.extend({}, defaultOptions, options);

    return function (chart) {

      if(!(chart instanceof Chartist.Line))
        return;

      var series = [];
      var labels = chart.data.labels;
      var coords = new Array(labels.length);

      chart.on('draw', function(data) {

        if (data.type === 'line')
          series.push(data.values);

        if (data.type === 'point')
          coords[data.index] = data.x;
      });

      var $chart = $(chart.container).append($tooltip);
      var index = -1;

      $chart.on('mouseleave', function () {
        index = -1;
        $tooltip.hide();
      });

      $chart.on('mousemove', function (event) {

        if (event.target.tagName.toLowerCase() !== 'svg') return;

        var offsetX = event.offsetX || event.originalEvent.layerX;
        var offsetY = event.offsetY || event.originalEvent.layerY;

        var precision = (coords[1] - coords[0]) * 0.1;
        var newIndex = binarySearch(coords, offsetX, precision);

        if (newIndex === index) return;

        index = newIndex;

        if (index === -1)
          $tooltip.hide();
        else
          showTooltip(labels[index], getValues(series, index),
                      getTooltipOffset(coords[index], offsetY));
      });
    };
  };

}(window, document, Chartist));