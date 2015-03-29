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

  Array.prototype.binarySearch = function (value, precision, start, end) {

    if (start === undefined) start = 0;
    if (end === undefined) end = this.length - 1;

    if (start > end) return -1;

    var middle = Math.floor((start + end) / 2);

    if (Math.abs(this[middle] - value) < precision)
      return middle;
    else if (value < this[middle])
      return this.binarySearch(value, precision, start, middle - 1);
    else
      return this.binarySearch(value, precision, middle + 1, end);
  };

  var tooltipHtml = function (labels, series, index) {

    var html = '<div class="header">' + (labels[index] || '') + '</div><ul class="values">';

    $.each(series, function (i, values) {
      html += '<li class="value"><div class="label series-' + Chartist.alphaNumerate(i) +
              '">&nbsp;</div>' + values[index] + '</li>';
    });

    return html + '</ul>'
  };

  Chartist.plugins = Chartist.plugins || {};
  Chartist.plugins.ctTooltip = function(options) {

    options = Chartist.extend({}, defaultOptions, options);

    return function (chart) {

      if(!(chart instanceof Chartist.Line))
        return;

      var labels = chart.data.labels;
      var series = [];
      var coords = new Array(labels.length);
      var bottom;

      chart.on('draw', function(data) {

        if (data.type === 'line')
          series.push(data.values);

        if (data.type === 'point')
          coords[data.index] = data.x;

        if (data.type === 'grid' && data.axis === 'y' && data.index === 0)
          bottom = data.y1;
      });

      var $chart = $(chart.container);

      var precision;
      var tooltipIndex = -1;
      var $tooltip = $('<div class="ct-tooltip"></div>').appendTo($chart).hide();

      $chart.on('mouseleave', function () {

        if (event.target.tagName !== 'svg') return;

        tooltipIndex = -1;
        $tooltip.hide();
      });

      $chart.on('mousemove', function (event) {

        if (event.target.tagName !== 'svg') return;

        precision =  precision || (coords[1] - coords[0]) * 0.2;

        var offsetX = (event.offsetX || event.originalEvent.layerX);
        var newIndex = coords.binarySearch(offsetX, precision);

        if (newIndex === tooltipIndex)
          return;

        tooltipIndex = newIndex;

        if (tooltipIndex === -1)
          $tooltip.hide();
        else
          $tooltip
            .html(tooltipHtml(labels, series, tooltipIndex))
            .css({
              left: coords[tooltipIndex] + 10,
              top: bottom - ($tooltip.outerHeight() + 10)
            })
            .show();
      });
    };
  };

}(window, document, Chartist));