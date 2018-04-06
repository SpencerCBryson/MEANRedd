$("#submit").click(function () {
    let subreddits_raw = $("#subreddit").val()
    let usr_stop_words_raw = $("#stopwords").val()

    //reset values
    data = {};
    finished = {};
    cookedData = {};
    globalWordCounts = {};
    combined = {};
    result = [];
    total_iterations = 0
    subredditCount = 0
    listingCount = 0
    max_iterations = 0
    support = 0
    parsedComments = 0

    $("#frequent_set_list").empty()
    $("#word_list").empty()
    $("#patternResults").hide()
    $("#countMsg").hide();
    $("#graphInfo").hide();


    $("#results").show()

    // add users specified stop words
    if (usr_stop_words_raw) {
        let usr_stop_words = usr_stop_words_raw.replace(/\s/g, '').split(',')
        for (word of usr_stop_words)
            stop_words.add(word)
        console.log("added stop words: " + usr_stop_words_raw)
    }

    // start getting data
    if (subreddits_raw) {
        $("#msg").css('display', 'inline')
        subreddits = subreddits_raw.replace(/\s/g, '').split(',')

        //        max_iterations = subreddits.length * maxListings
        console.log("fetching " + maxListings + " listings")

        var params;
        choice = $("#radio input[type='radio']:checked").val();

        if (choice == "new")
            params = newParams
        else if (choice == "hot")
            params = hotParams
        else
            params = topParams + choice

        subredditCount = subreddits.length;
        maxListingCount = subreddits.length * maxListings;

        subreddits.map(subreddit =>
            getPosts(subreddit, params, '', 0)
        );

        console.log("querying: " + subreddits_raw)
    } else {
        console.error("no entry")
    }
});

$("#recompute_apriori").click(function () {
    support = $("#min_support").val()
    $("#countMsg").hide();
    generateCandidatePairs();
});

var graph = {}

$("#drawGraph").click(function () {
    var node_map = {};

    var edges = []
    var nodes = []


    for (edge of edgeList) {
        let pair = edge.candidate

        // fetch nodes
        for (word of pair) {
            if (!(word in node_map)) {
                node_map[word] = wordScores[word]
            }
        }

        let edge_data = {
            "source": pair[0],
            "target": pair[1],
            "value": edge.frequency
        };

        edges.push(edge_data)
    }

    for (node of Object.keys(node_map)) {
        let node_data = {
            id: node,
            value: node_map[node]
        };
        nodes.push(node_data)

    }

    graph = { nodes: nodes, links: edges }

    $("#currentGraph").empty();

    $("#currentGraph").append("<div id=\"graphTitle\"><strong>" + subreddits[0] + "</strong>: " + choice + "</div>");

    drawGraph(graph);
});

$("#saveGraph").click(function () {
    var savedGraph = $("#savedGraph");
    var svgcopy = $("#currentsvg").clone();
    var titlecopy = $("#graphTitle").clone();

    savedGraph.empty();
    savedGraph.append(titlecopy);
    savedGraph.append(svgcopy);
});

$("#clearGraph").click(function () {
    $("#savedGraph").empty();
    $("#currentGraph").empty();
});

var prunedWords = [];
var prunedPalette = ["#1a9641", "#d7191c"];
var palette = ['#66c2a5','#fc8d62'];
var pruned = d3.scaleOrdinal()
        .domain([false, true])
        .range([1.0, 0.3]);

function display(results, cookedData, combinedData) {
    wordScores = combinedData.wordScores;
    wordCounts = combinedData.wordCounts;
    let postCounts = Object.keys(data).map(sr => data[sr].length)

    //Make a collection of the top words and their values
    var topWords = [];
    results.forEach(function (entry) {
        var tempObj = {}
        tempObj.word = entry;
        tempObj.value = wordScores[entry];
        tempObj.count = wordCounts[entry];
        if (prunedWords.includes(tempObj.word)) tempObj.pruned = true;
        else tempObj.pruned = false;
        topWords.push(tempObj);
    });
    topWords.reverse();

    // display(topWordRankings, cookedData, combined);

    //Svg Attributes
    var width = $("#topWords").width();
    var height = 1000;
    var margin = { top: 20, right: 20, bottom: 30, left: 70 };

    var xUpperBound = d3.max(topWords, d => d.value);

    //Scale definition
    var x = d3.scaleLinear()
        .domain([0, xUpperBound])
        .range([0, width - margin.left]);
    var y = d3.scaleBand()
        .domain(topWords.map(function (d) { return d.word; })).padding(0.1)
        .range([height, 0]);
    
    var barType = d3.scaleOrdinal()
        .domain(["score", "count"])
        .range(palette)

    d3.select("svg").remove();
    var svg = d3.select("#topWords").append("svg")
        .attr("width", width)
        .attr("height", height)

    var canvas = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .attr("id", "canvas");

    canvas.append("g")
        .attr("class", "y axis")
        .call(d3.axisLeft(y));

    var bar = canvas
        .selectAll(".bar")
        .data(topWords)
        .enter()
        .append("g")
          .on("click", removeWord);

    // score bar
    bar.append("rect")
        .attr("class", "bar")
        .attr("x", 0)
        .attr("height", y.bandwidth())
        .attr("y", d => y(d.word))
        .attr("width", d => x(d.value - d.count))
        .attr("fill", d => barType("score"))
        .attr("opacity", d => pruned(d.pruned))
        .append("title")
          .text(d => "Score:" + d.value);

    // count bar
    bar.append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.value - d.count))
        .attr("height", y.bandwidth())
        .attr("y", function (d) { return y(d.word); })
        .attr("width", d => x(d.count))
        .attr("fill", d => barType("count"))
        .attr("opacity", d => pruned(d.pruned))
        .attr("", d => console.log(d))
        .on("click", removeWord);
        
    bar.append("text")
        .text(d => d.value.toFixed(2))
        .attr("x", d => x(d.value) - 50)
        .attr("y", d => y(d.word) + (y.bandwidth() - 5))
        .style("font-family", "sans-serif")
        .style("font-size", "12px")
        .style("fill", "white")
        .style("text-decoration", d => (d.pruned) ? "italics line-through" : "none")
        .style("z-index", 1);

    // bar.exit().remove();
}

function removeWord(selection, index, group) {
    selection.pruned = !selection.pruned;

    d3.selectAll("rect")
        // .datum(d)
        .transition()
        .attr("opacity", d => pruned(d.pruned))
        .duration(750);

    d3.selectAll(".tick text")
        .transition()
        .attr("class", d => (d == selection.word && selection.pruned) ? "prunedText" : "none");

    if (selection.pruned) 
        prunedWords.push(selection.word)
    else
        prunedWords.splice(prunedWords.indexOf(selection.word))
    
    
    var newGraph = {};
    
    newGraph.nodes = graph.nodes.filter(d => !prunedWords.includes(d.id));
    newGraph.links = graph.links.filter(d => !prunedWords.includes(d.source.id) || !prunedWords.includes(d.target.id));

    console.log(graph)

    d3.selectAll(".node")
        .data(graph)
        .filter(d => console.log(d))
        .exit()
        .transition()
        .duration(500)
        .attr("r", 0)
        .remove();
    
    // console.log(d); console.log(prunedWords);

    // display(topWordRankings, cookedData, combinedData);
}






















      /* Commented out to replace with visualization
      for(word of results) {
        let str = '<li class="list-group-item"><strong>' + word + ':</strong> ' + (wordScores[word]).toFixed(2) + '<ul>';

    let postCounts = Object.keys(data).map(sr => data[sr].length)


    $("#msg").text("Processed " + postCounts.reduce((x, y) => x + y) + " posts");

    for (word of results) {
        let str = '<li class="list-group-item word"><strong>' + word + ':</strong> ' + (wordScores[word]).toFixed(2) + '<ul>';

        for (sr of Object.keys(cookedData)) {
            str += '<li>' + sr + ': ' + cookedData[sr].wordScores[word] + '</li>'
        }

        str += '</ul></li>';
        $("#word_list").append(str);
    }

    $("li > ul").hide()

    if (Object.keys(cookedData).length > 1) {
        $("#contribs").show();

        $("#contribs").click(function () {
            $("li > ul").toggle()
        });
    }

    setListener();

  */
