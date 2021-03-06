const CANVAS = {
  margin: {
    top: 20,
    right: 100,
    bottom: 50,
    left: 50,
  },
  // 5 seconds shift
  xDomainOriginShift: 5,
  // 1 place shift
  yDomainOriginShift: 1,
  circleRadius: 5,
  colorHasDopingAllegation: '#E53935',
  colorNoDopingAllegation: '#90CAF9',
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
      type: Array,
      default: () => [],
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
      // X values and scaling function
      let xArray = this.d3Data.map(a => a.x);
      this.axis.x.values = d3
        .scaleLinear()
        .domain([d3.min(xArray), d3.max(xArray) + CANVAS.xDomainOriginShift])
        .range([this.chartWidth, 0]);
      
      // this.axis.x.scale becomes a function that converts a x value to a x position
      this.axis.x.scale = d3
        .scaleLinear()
        .domain([d3.min(xArray), d3.max(xArray) + CANVAS.xDomainOriginShift])
        // d3.min(xArray) is mapping to this.chartWidth
        // d3.max(xArray) + 5 (same as above) is mapping to starting of axis
        .range([this.chartWidth, 0]);
      

      // Y values and scaling function
      let yArray = this.d3Data.map(a => a.y);
      this.axis.y.values = d3
        .scaleLinear()
        // Labels on axis, should be equal to or larger than dataset
        .domain([d3.min(yArray), d3.max(yArray) + CANVAS.yDomainOriginShift])
        // Together with yGuide translate below, determines where to start drawing the axis
        .range([0, this.chartHeight]);
      
      // this.axis.y.scale becomes a function that converts a y value to a y position
      this.axis.y.scale = d3
        .scaleLinear()
        .domain([d3.min(yArray), d3.max(yArray) + CANVAS.yDomainOriginShift])
        // Smallest value is mapping to margin-top
        // Bottom left of y axis: this.chartHeight + CANVAS.margin.top, mapping to largest value on y axis
        .range([CANVAS.margin.top, this.chartHeight + CANVAS.margin.top]);

      this.drawGuide();
      this.drawData();
      this.drawLegends();
      this.addListeners();
    }
  },
  methods: {
    /**
     * Standard code to create a d3 element
     * 
     * @param {Object} param0 
     */
    createD3Element ({
      data = [],
      transformX = CANVAS.margin.left + 1,
      transformY = 0,
      type = '',
    } = {}) {
      let result = this.ddd.svg
        .append('g')
        .attr('transform', `translate(${transformX}, ${transformY})`);
      if (type) {
        result = result
          .selectAll(type)
          .data(data)
          .enter()
          .append(type);
      }
      return result;
    },
    /**
     * Draw dots on chart
     */
    drawData () {
      // translate(x, y) specifies where bar begins, +1 to move right of y axis
      // scatterplot uses circle instead of rect
      this.ddd.chart = this
        .createD3Element({
          data: this.d3Data.map(d => ({
            hasDopingAllegation: d.hasDopingAllegation,
            x: d.x,
            y: d.y,
          })),
          type: 'circle',
        })
        .attr('fill', d => d.hasDopingAllegation ? CANVAS.colorHasDopingAllegation : CANVAS.colorNoDopingAllegation)
        .attr('r', _ => CANVAS.circleRadius)
        .attr('cx', d => this.axis.x.scale(d.x))
        .attr('cy', d => this.axis.y.scale(d.y));
      
      // Add names of cyclist
      this
        .createD3Element({
          data: this.d3Data.map(d => ({
            text: d.name,
            x: d.x,
            y: d.y,
          })),
          type: 'text',
        })
        .text(d => d.text)
        .attr('x', d => this.axis.x.scale(d.x) + CANVAS.circleRadius + 5)
        .attr('y', d => this.axis.y.scale(d.y) + CANVAS.circleRadius)
        .style('font-size', '12px');
    },
    drawLegends () {
      let left = this.chartWidth - 180;
      let top = Math.floor(this.chartHeight / 2);
      let legends = [
        { x: left, y: top, color: CANVAS.colorHasDopingAllegation, text: 'Riders with doping allegations', },
        { x: left, y: top + 30, color: CANVAS.colorNoDopingAllegation, text: 'No doping allegation', },
      ];

      // Colored dots in legend
      this
        .createD3Element({
          data: legends,
          type: 'circle',
        })
        .attr('fill', d => d.color)
        .attr('r', _ => CANVAS.circleRadius)
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);
      
      // Text in legend
      this
        .createD3Element({
          data: legends,
          type: 'text',
        })
        .text(d => d.text)
        .attr('x', d => d.x + CANVAS.circleRadius + 5)
        .attr('y', d => d.y + CANVAS.circleRadius)
        .style('font-size', '15px');
    },
    drawGuide () {
      // Y Guide
      // translate(x, y) specifies where y axis begins, drawn from top to bottom
      this
        .createD3Element({
          transformX: CANVAS.margin.left,
          transformY: CANVAS.margin.top,
        })
        .call(d3
          .axisLeft(this.axis.y.values)
          .ticks(5)
        );
      
      let yLabel = [
        { x: -90, y: -25, text: 'Ranking', },
      ];
      this
        .createD3Element({
          data: yLabel,
          type: 'text',
        })
        .text(d => d.text)
        .attr("transform", "rotate(-90)")
        .attr('x', d => d.x)
        .attr('y', d => d.y)
        .style('font-size', '15px')
        .style('font-weight', 'bold')
        .attr('text-anchor', 'middle')
        .style('fill', '#6D4C41');
      

      // X Guide
      // transform(x, y) specifies where x axis begins, drawn from left to right
      this
        .createD3Element({
          transformX: CANVAS.margin.left,
          transformY: CANVAS.margin.top + this.chartHeight,
        })
        .call(d3
          .axisBottom(this.axis.x.values)
          .ticks(10)
          .tickFormat(d => d3.timeFormat('%M:%S')(d * 1000))
        );
      
      let xLabel = [
        { x: Math.floor(this.chartWidth / 2), y: this.graphHeight - (CANVAS.margin.bottom - 40), text: 'Minutes Behind Fastest Time', },
      ];
      this
        .createD3Element({
          data: xLabel,
          type: 'text',
        })
        .text(d => d.text)
        .attr('x', d => d.x)
        .attr('y', d => d.y)
        .style('font-size', '15px')
        .style('font-weight', 'bold')
        .attr('text-anchor', 'middle')
        .style('fill', '#6D4C41');
    },
    addListeners () {
      let component = this;
      this.ddd.chart
        .on('mouseover', function(data, index, circles) {
          // Approximate width of tooltip window
          let widthOfTooltip = 280;
          let tooltipX = +d3.event.pageX + ((d3.event.pageX + widthOfTooltip) > window.innerWidth ? (-widthOfTooltip) : 15);
          let tooltipY = +d3.event.pageY - 100;
          component.ddd.tooltip.html(component.d3Data[index].tooltip)
            // Top left of tooltip, relative to screen, not graph
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
    this.ddd.svg = d3.select(`#${this.id} svg`);
    this.ddd.tooltip = d3.select('body')
                         .append('div')
                         .attr('class', 'tooltip elevation-3')
                         .style('opacity', 0);
  },
});
