const WRAPPER = {
  width: 1100,
  height: 700,
  padding: 55,
  background: 'rgba(255, 255, 255, .7)',
}

const CANVAS = {
  margin: {
    top: 20,
    right: 10,
    bottom: 25,
    left: 20,
  }
}

const CHART = {
  width: WRAPPER.width - WRAPPER.padding * 2 - CANVAS.margin.right - CANVAS.margin.left,
  height: WRAPPER.height - WRAPPER.padding * 2 - CANVAS.margin.top - CANVAS.margin.bottom,
  background: 'rgba(255, 255, 255, 0)',
  barColor: '#000',
  barOffset: 0,
}

Vue.component('d3-scatterplot-graph', {
  template: `
    <div
      class="elevation-5 pt-4"
      :style="wrapperStyles"
    >
      <h2 class="mb-4 display-1">{{ appName }}</h2>
      <div :id="id" />
      remove: {{ this.formatSeconds(76) }}
    </div>
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
    appName: {
      type: String,
      default: ''
    },
    d3Data: {
      type: Object,
      default: () => {}
    }
  },
  computed: {
    wrapperStyles () {
      return `height:${WRAPPER.height}px; width:${WRAPPER.width}px; margin:auto; background:${WRAPPER.background};`;
    }
  },
  watch: {
    /**
     * Data is now available to build structure of chart, e.g. xGuide, yGuide
     */
    d3Data () {
      // X axis
      this.axis.x.values = d3
        .scaleLinear()
        .domain([0, d3.max(this.d3Data.x)])
        .range([CHART.width, 0]);
      
      // How far apart are the ticks on x axis, e.g. 7 days apart
      this.axis.x.ticks = d3
        .axisBottom(this.axis.x.values)
        .ticks(10);
      
      // Setting first, last and gap between bars, note d3DataY is required
      this.axis.x.scale = d3
        // .scaleBand()
        // .domain(this.d3Data.y)
        // .paddingInner(CHART.barOffset)
        // .paddingOuter(0)
        // .range([0, CHART.width]);
        .scaleLinear()
        .domain([0, d3.max(this.d3Data.x)])
        .range([CHART.width, 0]);
      
      // transform(x, y) specifies where x axis begins, drawn from left to right
      let xGuide = this.ddd.svg
        .append('g')
        .attr('transform', `translate(${CANVAS.margin.left}, ${CANVAS.margin.top + CHART.height})`)
        .call(this.axis.x.ticks);
      

      // Y axis
      // .range specifies value from top left (1) to bottom left (high number)
      this.axis.y.values = d3
        .scaleLinear()
        // Actual data, 1 to max
        .domain([0, d3.max(this.d3Data.y)])
        // Label on axis, first number mapping to first number above
        .range([0, CHART.height]);
      
      // How many ticks are on the y axis
      this.axis.y.ticks = d3
        .axisLeft(this.axis.y.values)
        .ticks(10);
      
      // this.axis.y.scale becomes a function that converts a y value to a y position
      this.axis.y.scale = d3
        .scaleLinear()
        .domain([0, d3.max(this.d3Data.y)])
        .range([0, CHART.height]);
      
      // translate(x, y) specifies where y axis begins, drawn from top to bottom
      let yGuide = this.ddd.svg
        .append('g')
        .attr('transform', `translate(${CANVAS.margin.left}, ${CANVAS.margin.top})`)
        .call(this.axis.y.ticks);

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
          return CHART.barColor
        })
        .attr('r', _ => 5)
        .attr('cx', (data, index) => this.axis.x.scale(data[1]))
        .attr('cy', (data, index) => this.axis.y.scale(data[0]));
      
      // .delay sets speed of drawing
      this.ddd.chart
        .transition()
        .delay((data, index) => index * 5)
        .duration(100)
        .ease(d3.easeCircleIn)
        .attr('y', data => CHART.height - this.axis.y.scale(data) + CANVAS.margin.top)
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
        .attr('width', CHART.width + CANVAS.margin.right + CANVAS.margin.left)
        .attr('height', CHART.height + CANVAS.margin.top + CANVAS.margin.bottom)
        .style('background', CHART.background);
    this.ddd.svg = d3.select(`#${this.id} svg`);
    this.ddd.tooltip = d3.select('body')
                         .append('div')
                         .attr('class', 'tooltip elevation-3')
                         .style('opacity', 0);
  }
});