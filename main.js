var chartWidth = 0;

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
    $("#countMsg").hide();
    $("#info-row").hide();

    $("#msg-error").hide();
    $("#msg-box").show();
    $("#compute-spinner").show();
    $("#currentGraph").empty();

    if (!graphed) {
        $("#results").show();
        $("#tabs").show();
    }

    chartWidth = Math.max($("#topWords").width(), $("#patternResults").width(), chartWidth);

    // for first run
    $("#min_support").val(0.0)

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
        $("#msg").hide();
        $("#msg-error").show();

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

var aprioriWorker = new Worker('patternAnalysis.js');
var runningApriori = false;

function recomputeApriori() {
    support = $("#min_support").val();
    support = parseFloat(support);
    $("#countMsg").hide();

    $("#msg-box").show();
    $("#msg-text").text("Computing Apriori...");
    
    function finished(response) {
        var edgeList = response.data.edgeList;
        var frequentSets = response.data.frequentSets;

        if (frequentSets.length == 0) {
            setsTab();
            $("#countMsg").show();
        }     
        
        $("#graphHeader", "#currentGraph").remove()

        if (edgeList.length > 0) {
            var graph = generateGraph(edgeList);
            
            if (graphed) {
                drawGraph(graph);
            } else {
                initGraph(graph);
            }
            graphed = true;
        }
        var s = response.data.support;

        if (graphedFq) {
            displayFrequentSets(frequentSets);
        } else {
            initFrequent(frequentSets);

            graphedFq = true;
        }
        
        $("#min_support").val(s.toFixed(2));
        $("#msg-box").hide();
        $("#graphInfo").show();
        $("#frequent_set_count").text(frequentSets.length);
        drawGradient(frequentSets);

        runningApriori = false;
    }

    if (runningApriori) {
        aprioriWorker.terminate();
        aprioriWorker = new Worker('patternAnalysis.js');
    }

    runningApriori = true;
    aprioriWorker.addEventListener("message", finished, false);
    aprioriWorker.postMessage({ 
        topWords: result.filter(word => !prunedWords.includes(word)).slice(0, nPosts), 
        data: data, 
        support: support
    });
    
}

$("#recompute_apriori").click(recomputeApriori);

var graphGlobal = {}
var graphed = false;
var graphedFq = false;

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

    $("#currentGraph").prepend("<div id=\"graphHeader\">"
        + "<strong style=\"display: inline-block; vertical-align: top;\">" 
        + subreddits[0] + ":&nbsp;"
        + "</strong>" 
        + "<span style=\"display: inline-block; vertical-align: top;\">" 
        + choice + ";&nbsp;&nbsp;&nbsp"
        + "</span>"
        + "<strong style=\"display: inline-block; vertical-align: top;\">" 
        + "color scale:"
        + "</strong>"
        + "</div>");

    return graph;
}

$("#saveGraph").click(function () {
    $("#savedGraph svg").remove();
    $("#savedGraph #graphTitle").remove();
  
    var svgcopy = $("#currentsvg").clone();
    var titlecopy = $("#graphHeader").clone();

    $("#mainGradient", titlecopy).attr("id", "snapGradient");
    $("rect", titlecopy).addClass("snapFilled");
    $("rect", titlecopy).removeClass("filled");
    $(titlecopy).css("padding-top", "15px");

    $("#savedGraph").append(titlecopy);
    $("#savedGraph").append(svgcopy);
  
    $("#snap-msg").hide();
    snapTab();
});

function removeWord(selection, index, group) {
    selection.pruned = !selection.pruned;
    
    if (selection.pruned) 
        prunedWords.push(selection.word)
    else
        prunedWords = prunedWords.filter(d => !(d == selection.word))
    
    console.log(prunedWords)

    var items = d3.selectAll(".item")
        // .datum(d)
    items.selectAll(".bar")
        .transition()
            .attr("opacity", d => pruned(d.pruned))
            .duration(750);

    items.selectAll("text")
        .attr("class", d => d.pruned ? "topWordText prunedText" : "topWordText");
    
    topWordRankings = result.filter(d => !prunedWords.includes(d)).slice(0, nPosts);
    recomputeApriori();
}
