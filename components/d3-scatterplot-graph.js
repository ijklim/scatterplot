const CANVAS = {
  margin: {
    top: 20,
    right: 20,
    bottom: 50,
    left: 50,
  },
  circleRadius: 5,
};

Vue.component('d3-scatterplot-graph', {
  template: `
    <div :id="id" />
  `,
  // svg cannot be property by itself, changes object type during assignment, within ddd object is fine
  data () {
    return {
      axis: {
        x: {},
        y: {}
      },
      ddd: {},
      id: 'd3-' + Math.round(Math.random() * 1000000)
    }
  },
  props: {
    d3Data: {
      type: Object,
      default: () => {},
    },
    graphHeight: {
      type: Number,
      default: 0,
    },
    graphWidth: {
      type: Number,
      default: 0,
    },
  },
  computed: {
    chartHeight () {
      return this.graphHeight - CANVAS.margin.top - CANVAS.margin.bottom;
    },
    chartWidth () {
      return this.graphWidth - CANVAS.margin.right - CANVAS.margin.left;
    },
  },
  watch: {
    /**
     * Data is now available to build structure of chart, e.g. xGuide, yGuide
     */
    d3Data () {
      // X axis
      this.axis.x.values = d3
        .scaleLinear()
        .domain([d3.min(this.d3Data.x), d3.max(this.d3Data.x)])
        .range([this.chartWidth, 0]);
      
      // How far apart are the ticks on x axis, e.g. 7 days apart
      this.axis.x.ticks = d3
        .axisBottom(this.axis.x.values)
        .ticks(10)
        // .ticks(d3.timeMinute.every(1))
        // .tickFormat(d3.timeMinute.every(1), '%I:%M');
      
      // Setting first, last and gap between bars, note d3DataY is required
      this.axis.x.scale = d3
      // this.axis.x.scale = d3
        // .scaleBand()
        // .domain(this.d3Data.y)
        // .paddingInner(CHART.barOffset)
        // .paddingOuter(0)
        // .range([0, this.chartWidth]);
        .scaleLinear()
        .domain([d3.min(this.d3Data.x), d3.max(this.d3Data.x)])
        .range([this.chartWidth, 0]);
      
      // transform(x, y) specifies where x axis begins, drawn from left to right
      let xGuide = this.ddd.svg
        .append('g')
        .attr('transform', `translate(${CANVAS.margin.left}, ${CANVAS.margin.top + this.chartHeight})`)
        .call(this.axis.x.ticks);
      

      // Y axis
      this.axis.y.values = d3
        .scaleLinear()
        // Labels on axis, should be equal to or larger than dataset
        .domain([d3.min(this.d3Data.y), d3.max(this.d3Data.y) + 1])
        // Together with yGuide translate below, determines where to start drawing the axis
        .range([0, this.chartHeight]);
      
      // How many ticks are on the y axis
      this.axis.y.ticks = d3
        .axisLeft(this.axis.y.values)
        .ticks(5);
      
      // this.axis.y.scale becomes a function that converts a y value to a y position
      this.axis.y.scale = d3
        .scaleLinear()
        .domain([d3.min(this.d3Data.y), d3.max(this.d3Data.y) + 1])
        // Smallest value is mapping to margin-top
        // Bottom left of y axis: this.chartHeight + CANVAS.margin.top, mapping to largest value on y axis
        .range([CANVAS.margin.top, this.chartHeight + CANVAS.margin.top]);
      
      // translate(x, y) specifies where y axis begins, drawn from top to bottom
      let yGuide = this.ddd.svg
        .append('g')
        .attr('transform', `translate(${CANVAS.margin.left}, ${CANVAS.margin.top})`)
        .call(this.axis.y.ticks);

      // DEBUG: Draw line for testing purpose
      // let pathString = d3.line()([
      //   [CANVAS.margin.left, this.axis.y.scale(30)],
      //   [this.chartWidth+50, this.axis.y.scale(30)]
      // ]);
      // this.ddd.svg
      //   .append('path')
      //   .attr('d', pathString)
      //   .style('stroke', 'red')
      //   .style('stroke-dasharray', '3')

      this.draw();
      this.addListeners();
    }
  },
  methods: {
    pad2digits (num) {
      return ('0' + num).slice(-2);
    },
    formatSeconds (seconds) {
      return this.pad2digits(Math.floor(seconds / 60)) + 
             ':' + 
             this.pad2digits(seconds % 60);
    },
    /**
     * Draw bars on chart
     */
    draw () {
      // translate(x, y) specifies where bar begins, +1 to move right of y axis
      // scatterplot uses circle instead of rect
      this.ddd.chart = this.ddd.svg
        .append('g')
        .attr('transform', `translate(${CANVAS.margin.left + 1}, 0)`)
        .selectAll('circle')
        .data(this.d3Data.y.map((y, index) => [y, this.d3Data.x[index]]))
        .enter()
        .append('circle');
      
      // rect needs x, y, width, and height
      // circles need cx, cy, and r
      this.ddd.chart
        .attr('fill', (data, index) => {
          return 'orange'
        })
        .attr('r', _ => CANVAS.circleRadius)
        .attr('cx', (data, index) => this.axis.x.scale(data[1]))
        .attr('cy', (data, index) => this.axis.y.scale(data[0]));
      
      // .delay sets speed of drawing
      this.ddd.chart
        .transition()
        .delay((data, index) => index * 5)
        .duration(100)
        .ease(d3.easeCircleIn)
        .attr('y', data => this.chartHeight - this.axis.y.scale(data) + CANVAS.margin.top)
        .attr('height', data => this.axis.y.scale(data));
    },
    addListeners () {
      let component = this;
      this.ddd.chart
        .on('mouseover', function(yData, index) {
          let tooltipX = d3.event.pageX + 5;
          let tooltipY = d3.event.pageY - 100;
          component.ddd.tooltip.html(component.d3Data.tooltip[index])
            .style('left', `${tooltipX}px`)
            .style('top', `${tooltipY}px`)
            .style('opacity', 1);
          
          d3.select(this)
            .style('opacity', .5)
        })
        .on('mouseout', function(data) {
          component.ddd.tooltip.html('')
            .style('opacity', 0);
          
          d3.select(this)
            .transition()
            .duration(300)
            .style('opacity', 1)
        });
    }
  },
  mounted () {
    // Step #1: Select div to place d3 chart, set dimensions and color
    // Note: Code below must be in mounted(), created() does not work
    d3.select(`#${this.id}`)
      .append('svg')
        .attr('width', this.chartWidth + CANVAS.margin.right + CANVAS.margin.left)
        .attr('height', this.chartHeight + CANVAS.margin.top + CANVAS.margin.bottom);
        // remove: .style('background', CHART.background);
    this.ddd.svg = d3.select(`#${this.id} svg`);
    this.ddd.tooltip = d3.select('body')
                         .append('div')
                         .attr('class', 'tooltip elevation-3')
                         .style('opacity', 0);
  },
});
