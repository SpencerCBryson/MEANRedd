// Based off of Mike Bostocks force directed graph example

var currentDiv = document.getElementById("currentGraph")

var width = currentDiv.clientWidth,
    height = 600;

//var simulation = d3.forceSimulation()
//    .force("link", d3.forceLink()
//        .id(function (d) { return d.id; })
//        .distance(100))
//    .force("charge", d3.forceManyBody())
//    .force("center", d3.forceCenter(width / 2, height / 2));

var simulation = d3.forceSimulation() 
            .force("charge", d3.forceManyBody().strength(-500).distanceMin(100).distanceMax(600)) 
            .force("link", d3.forceLink().id(function(d) { return d.id }).distance(100)) 
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("y", d3.forceY(0.001))
            .force("x", d3.forceX(0.001))

function drawGraph(graph) {
    var svg = d3.select(currentDiv)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("id", "currentsvg");
  
    let nodeRadius = 4;
    let nodeValues = graph.nodes.map(node => node.value)

    svg.selectAll("line")
        .remove();

    svg.selectAll("circle")
          .remove();

    svg.selectAll("text")
        .remove();
  

    var color = d3.scaleSequential(d3.interpolateYlGnBu)
                  .domain([0, d3.max(graph.links.map(link => link.value))])

    var fontsize = d3.scaleLinear()
        .domain(d3.extent(nodeValues))
        .range([12, 36])
    
    var nodesize = d3.scaleLinear()
        .domain(d3.extent(nodeValues))
        .range([nodeRadius, 12]);

    var link = svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(graph.links)
        .enter().append("line")
          .attr("stroke-width", function (d) { return d3.max( [1, Math.sqrt(d.value)] ) })
          .attr("stroke-opacity", 0.7)
          .style("stroke", function (d) { return color(d.value) })

    var node = svg.append("g")
        .attr("class", "node")
        .selectAll("text")
        .data(graph.nodes)
        .enter()
        .append("g");

    node.append("circle")
        .attr("r", d => nodesize(d.value))
        .attr("x", -8)
        .attr("y", -8)
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    node.append("text")
        //.attr("r", 7)
        .text(function (d) { return d.id; })
        .attr("dx", d => (4 + nodesize(d.value)))
        .attr("dy", ".35em")
        //.("fill", function(d) { return color(d.group); })
        .style("font-size", d => fontsize(d.value));

    console.log(+svg.attr("width"))

    node.append("title")
        .text(function (d) { return d.id; })
    simulation
        .nodes(graph.nodes)
        .on("tick", ticked);

    simulation.force("link")
        .links(graph.links);

    simulation.alphaTarget(0.3).restart()

    function ticked() {
        link
            .attr("x1", function (d) { return d.source.x; })
            .attr("y1", function (d) { return d.source.y; })
            .attr("x2", function (d) { return d.target.x; })
            .attr("y2", function (d) { return d.target.y; });

         node.select("circle")
             .attr("cx", function (d) { return d.x = Math.max(nodesize(d.value), Math.min(+svg.attr("width") - nodesize(d.value), d.x)); })
             .attr("cy", function (d) { return d.y = Math.max(nodesize(d.value), Math.min(+svg.attr("height") - nodesize(d.value), d.y)); });
      
        node.select("text")
             .attr("x", function (d) { return d.x = Math.max(nodesize(d.value), Math.min(+svg.attr("width") - nodesize(d.value), d.x)); })
             .attr("y", function (d) { return d.y = Math.max(nodesize(d.value), Math.min(+svg.attr("height") - nodesize(d.value), d.y)); });
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
