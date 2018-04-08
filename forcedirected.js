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
            .force("charge", d3.forceManyBody().strength(-500).distanceMin(150).distanceMax(500)) 
            .force("link", d3.forceLink().id(function(d) { return d.id }).distance(150)) 
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("y", d3.forceY(height / 2))
            .force("x", d3.forceX(width / 2))

function initGraph(graph) {
    svg = d3.select(currentDiv)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("id", "currentsvg");
    
    svg.append("g").attr("class", "links");
    svg.append("g").attr("class", "nodes");
    
    drawGraph(graph);
}

function drawGraph(graph) {
   console.log(graph)
  
    let nodeRadius = 4;
    let nodeValues = graph.nodes.map(node => node.value)

//    svg.selectAll("line")
//        .remove();
//
//    svg.selectAll("circle")
//          .remove();
//
//    svg.selectAll("text")
//        .remove();
  

    var color = d3.scaleSequential(d3.interpolateYlGnBu)
                  .domain([0, d3.max(graph.links.map(link => link.value))])

    var fontsize = d3.scaleLinear()
        .domain(d3.extent(nodeValues))
        .range([12, 36])
    
    var nodesize = d3.scaleLinear()
        .domain(d3.extent(nodeValues))
        .range([nodeRadius, 12]);

    var link = d3.select("#currentGraph .links")
        .selectAll(".link")
        .data(graph.links, d => d.source.id + d.target.id);

    var edgeScale = d3.scaleLinear()
        .domain(d3.extent(graph.links.map(edge => edge.value)))
        .range([6.0, 12.0]);
    
    link.enter()
        .append("line")
            .style("stroke-opacity", 0.0)
            .attr("class", "link")
            .attr("stroke-width", d => edgeScale(d.value))
            .style("stroke", function (d) { return color(d.value) })
        .transition()
            .duration(150)
            .style("stroke-opacity", 0.7);
    
    link.exit()
        .transition()
            .duration(150)
            .style("stroke-opacity", 0.0)
            .remove();

    var node = d3.select("#currentGraph .nodes")
        .selectAll(".node")
        .data(graph.nodes, d => d.id);
        
    var newNodes = node.enter()
        .append("g")
        .attr("class", "node");
    
    newNodes.append("circle")
                .attr("r", 0)
    //            .attr("cx", 150)
    //            .attr("cy", 150)
                .call(d3.drag()
                    .on("start", dragstarted)
                    .on("drag", dragged)
                    .on("end", dragended))
            .transition()
                .duration(150)
                .attr("r", d => nodesize(d.value));
    
    newNodes.append("text")
            //.attr("r", 7)
            .style("opacity", 0)
            .text(function (d) { return d.id; })
            .attr("dx", d => (4 + nodesize(d.value)))
            .attr("dy", ".35em")
            //.("fill", function(d) { return color(d.group); })
            .style("font-size", d => fontsize(d.value))
            .style("user-select", "none")
        .transition()
            .duration(150)
            .style("opacity", 1.0);
    
    var nodeRemove = node.exit();
    
    console.log(nodeRemove)
        
    nodeRemove.select("circle")
        .transition()
        .duration(150)
        .attr("r", 0)
        .remove();
    
    nodeRemove.select("text")
        .transition()
        .duration(150)
        .style("opacity", 0)
        .remove();
    
    nodeRemove.transition().duration(750).remove();

    console.log(+svg.attr("width"))

    node.append("title")
        .text(function (d) { return d.id; })
    simulation
        .nodes(graph.nodes)
        .on("tick", ticked);

    simulation.force("link")
        .links(graph.links);

    simulation.alphaTarget(0.3).restart()
    
    var nodes = svg.selectAll("#currentGraph .node");
    var links = svg.selectAll("#currentGraph .link");

    function ticked() {
        links
            .attr("x1", function (d) { return d.source.x; })
            .attr("y1", function (d) { return d.source.y; })
            .attr("x2", function (d) { return d.target.x; })
            .attr("y2", function (d) { return d.target.y; });

         nodes.select("circle")
             .attr("cx", function (d) { return d.x = Math.max(nodesize(d.value), Math.min(+svg.attr("width") - nodesize(d.value), d.x)); })
             .attr("cy", function (d) { return d.y = Math.max(nodesize(d.value), Math.min(+svg.attr("height") - nodesize(d.value), d.y)); });

         nodes.select("text")
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
