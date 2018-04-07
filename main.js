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
    $("#info-row").hide();


    $("#msg-box").show();
    $("#results").show()
    $("#tabs").show()

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
        choice = $("#radio").val();

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

$("#toggle-info").click(function() {
    $("#info-row").toggle();
})

function wordsTab () {
    $("#words-tab").addClass("active");
    $("#results").show();
    $("#sets-tab").removeClass("active");
    $("#patternResults").hide();
    $("#snap-tab").removeClass("active");
    $("#savedGraph").hide();
}

function setsTab() {
    $("#words-tab").removeClass("active");
    $("#results").hide();
    $("#sets-tab").addClass("active");
    $("#patternResults").show();
    $("#snap-tab").removeClass("active");
    $("#savedGraph").hide();
}

function snapTab() {
    $("#words-tab").removeClass("active");
    $("#results").hide();
    $("#sets-tab").removeClass("active");
    $("#patternResults").hide();
    $("#snap-tab").addClass("active");
    $("#savedGraph").show();
}

$("#words-tab").click(function() {
    wordsTab();
});

$("#sets-tab").click(function() {
    setsTab();
});

$("#snap-tab").click(function() {
    snapTab();
});

function displayPatterns(frequentSets) {
    var container = $("#patternResults");
    var ul = $("#frequent_set_list");
    var min_sup = $("#min_support");
    
    console.log("Done apriori")
    
    min_sup.val(support)
    ul.empty()
    
    if(frequentSets.length == 0)
        $("#countMsg").show()
        
    $("#frequent_set_count").text(frequentSets.length)
    
    $("#patternStatus").text("Frequent sets of meaningful words");
    
    for (item of frequentSets) {
        words = item.candidate.reduce((a, b) => String(a) + ', ' + String(b));
        $(ul).append('<li class="list-group-item ellipsis">' + '<strong class="ellipsis-item"> ' + words + '</strong> '
                    + '<span class="badge badge-primary badge-pill">' + item.frequency
                    + '</span></li>');
    }
    
    container.append(ul)
    //container.show();
    $("#graphInfo").show()
}

function recomputeApriori() {
    support = $("#min_support").val();
    support = parseFloat(support);
    $("#countMsg").hide();

    $("#msg-box").show();
    $("#msg-text").text("Recomputing Apriori...");
    
    var aprioriWorker = new Worker('patternAnalysis.js');
    
    function finished(response) {
        var edgeList = response.data.edgeList;
        
        displayPatterns(response.data.frequentSets);
        graphGlobal = generateGraph(edgeList);
        
        if (graphed)
            drawGraph(graphGlobal);
        else
            init(graphGlobal);
        var s = response.data.support;
        
        $("#min_support").val(s.toFixed(2));
        $("#msg-box").hide();
        graphed = true;
    }
    
    aprioriWorker.addEventListener("message", finished, false);
    aprioriWorker.postMessage({ 
        topWords: result.filter(word => !prunedWords.includes(word)).slice(0, nPosts), 
        data: data, 
        support: graphed ? support : 0
    });
}

$("#recompute_apriori").click(recomputeApriori);

var graphGlobal = {}
var graphed = false;

function generateGraph(edgeList) {
    var node_map = {};

    var edges = []
    var nodes = []
    
    if(edgeList.length == 0) {
        setsTab(); 
        return; 
    }

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

    var graph = { nodes: nodes, links: edges }

    $("#currentGraph #graphTitle").remove()
    $("#currentGraph").prepend("<div id=\"graphTitle\"><strong>" + subreddits[0] + "</strong>: " + choice + "</div>");

    return graph;
}

$("#drawGraph").click(function () {
    generateGraph();
    
    if (!graphed) init();
    else drawGraph(graphGlobal);
    
    graphed = true;
});

$("#saveGraph").click(function () {
    $("#savedGraph svg").remove();
    $("#savedGraph #graphTitle").remove();
  
    var svgcopy = $("#currentsvg").clone();
    var titlecopy = $("#graphTitle").clone();

    $("#savedGraph").append(titlecopy);
    $("#savedGraph").append(svgcopy);
  
    $("#snap-msg").hide();
    snapTab();
});

$("#clearGraph").click(function () {
    $("#savedGraph svg").remove();
    $("#savedGraph #graphTitle").remove();
    $("#currentGraph").empty();
    $("#snap-msg").show();
});



var prunedWords = [];
// var palette = ['#80b1d3','#bebada'];
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

    $("#msg-box").hide();

    //Svg Attributes
    var width = $("#topWords").width();
    var margin = { top: 20, right: 20, bottom: 30, left: 70 };
    var bandWidth = 50;
    var height = bandWidth * nPosts;

    var xUpperBound = d3.max(topWords, d => d.value);

    //Scale definition
    var x = d3.scaleLinear()
        .domain([0, xUpperBound])
        .range([0, width]);
    var y = d3.scaleBand()
        .domain(topWords.map(function (d) { return d.word; }))
        .padding(0.1)
        .range([height, 0]);
    
    var barType = d3.scaleOrdinal()
        .domain(["score", "count"])
        .range(palette)

    d3.select("#freq-words").remove();
  
    var svg = d3.select("#topWords").append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("id","freq-words");

    var canvas = svg.append("g")
        // .attr("transform", "translate(" + 0 + "," + margin.top + ")")
        .attr("height", height + 50)
        .attr("id", "canvas");

    // canvas.append("g")
    //     .attr("class", "y axis")
    //     .call(d3.axisLeft(y));

    // var xAxis = d3.axisBottom(x)
    //     .ticks(4);

    // svg.append("g")
    //     .attr("transform", "translate(0," + height + ")")
    //     .call(customXAxis)

    // function customXAxis(g) {
    //     g.call(xAxis);
    //     g.select(".domain").remove();
    //     g.selectAll(".tick:not(:first-of-type) line").attr("stroke", "#777").attr("stroke-dasharray", "2,2");
    //     g.selectAll(".tick text").attr("x", 4).attr("dy", -4);
    //     }

    var bar = canvas
        .selectAll(".bar")
        .data(topWords)
        .enter()
        .append("g")
          .on("click", removeWord);

    // gray background for context
    console.log(topWords[0])
    bar.append("rect")
        .attr("class", "context-bar")
        .attr("x", 0)
        .attr("y", d => y(d.word))
        .attr("width", width)
        .attr("height", y.bandwidth())
        .attr("fill", "#eaedf2")
        .style("z-index", -1);

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
          .text(d => "Karma:" + (d.value - d.count));

    // count bar
    bar.append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.value - d.count))
        .attr("height", y.bandwidth())
        .attr("y", function (d) { return y(d.word); })
        .attr("width", d => x(d.count))
        .attr("fill", d => barType("count"))
        .attr("opacity", d => pruned(d.pruned))
        .append("title")
          .text(d => "Count:" + d.count);

        //.on("click", removeWord);
        
    bar.append("text")
        .text(d => d.value.toFixed(2))
        .attr("x", d => 5)
        .attr("y", d => y(d.word) + (y.bandwidth() - 5))
        .style("font-family", "sans-serif")
        .style("font-size", "10px")
        .style("fill", "black")
        .style("text-decoration", d => (d.pruned) ? "italics line-through" : "none")
        .style("z-index", 1);

    bar.append("text")
        .text(d => d.word)
        .attr("x", 5)
        .attr("y", d => y(d.word) + 20)
        .style("font-family", "sans-serif")
        .style("font-size", "17px")
        .style("fill", "black")
        .style("text-decoration", d => (d.pruned) ? "italics line-through" : "none")
        .style("z-index", 1);

    // bar.exit().remove();
}

function update() {
    
}

function removeWord(selection, index, group) {
    selection.pruned = !selection.pruned;
    
    if (selection.pruned) 
        prunedWords.push(selection.word)
    else
        prunedWords = prunedWords.filter(d => !(d == selection.word))
    
    console.log(prunedWords)

    d3.selectAll(".bar")
        // .datum(d)
        .transition()
        .attr("opacity", d => pruned(d.pruned))
        .duration(750);

    d3.selectAll(".tick text")
        .transition()
        .attr("class", d => prunedWords.includes(d) ? "prunedText" : "none");
    
//    var newGraph = {};
//    
//    newGraph.nodes = graphGlobal.nodes.filter(d => !prunedWords.includes(d.id));
//    newGraph.links = graphGlobal.links.filter(d => !(prunedWords.includes(d.source.id) || prunedWords.includes(d.target.id)));

//    console.log(graph)
//    console.log(newGraph)
    
    
    
    topWordRankings = result.filter(d => !prunedWords.includes(d)).slice(0, nPosts);
    recomputeApriori();
    
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
