(function () {

    var data = {
        labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        series: [
            [0, 1, 3, 3, 7, 5],
            [3, 2, 5, 0, 3, 7]
        ]
    };

    var options = {
        axisX: {
            labelInterpolationFnc: function (value) {
                return value;
            }
        },
        plugins: [
            Chartist.plugins.ctTooltip()
        ]
    };

    Chartist.Line($('.ct-chart')[0], data, options);
}());
