// Based off of Mike Bostocks force directed graph example

var currentDiv = document.getElementById("currentGraph")

var width = currentDiv.clientWidth,
    height = 600;

var color = d3.scaleOrdinal(d3.schemeCategory20);

var simulation = d3.forceSimulation()
    .force("link", d3.forceLink()
           .id(function(d) { return d.id; })
           .distance(100))
    .force("charge", d3.forceManyBody())
    .force("center", d3.forceCenter(width / 2, height / 2));

function drawGraph(graph) {
  var svg = d3.select(currentDiv)
              .append("svg")
                .attr("width",width)
                .attr("height",height)
                .attr("id","currentsvg");
  
  svg.selectAll("line")
      .remove();
  
//  svg.selectAll("circle")
//      .remove();
  
  svg.selectAll("text")
      .remove();
  
  var graph_meaningful = graph.nodes.map(node => node.value);
    
  
  var fontsize = d3.scaleLinear()
                    .domain(d3.extent(graph_meaningful))
                    .range([12,48])
  
  var link = svg.append("g")
      .attr("class", "links")
    .selectAll("line")
    .data(graph.links)
    .enter().append("line")
      .attr("stroke-width", function(d) { return Math.sqrt(d.value); });

  var node = svg.append("g")
      .attr("class", "nodes")
    .selectAll("text")
    .data(graph.nodes)
    .enter().append("text")
      //.attr("r", 7)
      .text(function(d) { return d.id; })
      //.("fill", function(d) { return color(d.group); })
      .style("font-size", d => fontsize(d.value))
      .call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended));
  
  console.log(+svg.attr("width"))

  node.append("title")
      .text(function(d) { return d.id; })
  simulation
      .nodes(graph.nodes)
      .on("tick", ticked);

  simulation.force("link")
      .links(graph.links);
  
  simulation.alphaTarget(0.3).restart()

  function ticked() {
    link
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    let offset = 8;
    
    node
        .attr("dx", function(d) { return d.x = Math.max(offset,Math.min(+svg.attr("width")-offset, d.x));})
        .attr("dy", function(d) { return d.y = Math.max(offset, Math.min(+svg.attr("height")-offset, d.y)); });
  }
}

function dragstarted(d) {
  if (!d3.event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(d) {
  d.fx = d3.event.x;
  d.fy = d3.event.y;
}

function dragended(d) {
  if (!d3.event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}
