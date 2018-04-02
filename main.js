$("#submit").click(function() {
  let subreddits_raw = $("#subreddit").val()
  let usr_stop_words_raw = $("#stopwords").val()

  //reset values
  data = {};
  finished = {};
  cookedData = {};
  globalWordCounts = {};
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
  if(usr_stop_words_raw) {
    let usr_stop_words = usr_stop_words_raw.replace(/\s/g,'').split(',')
    for(word of usr_stop_words)
      stop_words.add(word)
    console.log("added stop words: " + usr_stop_words_raw)
  }

  // start getting data
  if(subreddits_raw) {
    $("#msg").css('display','inline')
    subreddits = subreddits_raw.replace(/\s/g,'').split(',')

//        max_iterations = subreddits.length * maxListings
    console.log("fetching " + maxListings + " listings")

    var params;
    choice = $("#radio input[type='radio']:checked").val();

    if(choice == "new")
      params = newParams
    else if(choice == "hot")
      params = hotParams
    else
      params = topParams + choice

    subredditCount = subreddits.length;
    maxListingCount = subreddits.length * maxListings;

    subreddits.map( subreddit =>
        getPosts(subreddit, params, '', 0)
    );

    console.log("querying: " + subreddits_raw)
  } else {
    console.error("no entry")
  }
});

$("#recompute_apriori").click(function() {
    support = $("#min_support").val()
    $("#countMsg").hide();
    generateCandidatePairs();
});


$("#drawGraph").click(function() {
    var node_map = {};

    var edges = []
    var nodes = []


    for(edge of edgeList) {
        let pair = edge.candidate

        // fetch nodes
        for(word of pair) {
            if(!(word in node_map)) {
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

  for(node of Object.keys(node_map)) {
    let node_data = { id: node,
                      value: node_map[node]};
    nodes.push(node_data)

  }

  let graph = { nodes: nodes, links: edges }

  $("#currentGraph").empty();

  $("#currentGraph").append("<div id=\"graphTitle\"><strong>"+subreddits[0]+"</strong>: "+choice+"</div>");

  drawGraph(graph);
});

$("#saveGraph").click(function() {
    var savedGraph = $("#savedGraph");
    var svgcopy = $("#currentsvg").clone();
    var titlecopy = $("#graphTitle").clone();

    savedGraph.empty();
    savedGraph.append(titlecopy);
    savedGraph.append(svgcopy);
});

$("#clearGraph").click(function() {
    $("#savedGraph").empty();
    $("#currentGraph").empty();
});

  function display(results, cookedData, combinedData) {
      wordScores = combinedData.wordScores;
      let postCounts = Object.keys(data).map(sr => data[sr].length )

      //Make a collection of the top words and their values
      var topWords = [];
      results.forEach(function(entry) {
          var tempObj = {}
          tempObj.word = entry;
          tempObj.value = wordScores[entry];
          topWords.push(tempObj);
      });
      topWords.reverse();

      $("#msg").text("Processed " + postCounts.reduce((x,y) => x + y) + " posts");

      //Svg Attributes
      var width = 625
      var height = 1000
      var margin = {top: 20, right: 20, bottom: 30, left: 100}

      //Scale definition
      var x = d3.scaleLinear()
              .domain([0, d3.max(topWords, function(d) { return d.value; })])
              .range([0, width]);
      var y = d3.scaleBand()
              .domain(topWords.map(function(d) { return d.word; })).padding(0.1)
              .range([height, 0]);

      d3.select("svg").remove();
      var svg = d3.select("#topWords").append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)

      var g = svg.append("g")
      		.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
          .attr("id", "canvas");

      g.append("g")
          .attr("class", "y axis")
          .call(d3.axisLeft(y));

      g.selectAll(".bar")
          .data(topWords)
        .enter().append("rect")
          .attr("class", "bar")
          .attr("x", 0)
          .attr("height", y.bandwidth())
          .attr("y", function(d) { return y(d.word); })
          .attr("width", function(d) { return x(d.value); })
          .append("text")
           .text(function(d) { return d.value; })
           .attr("x", function(d) { return x(d.value)-100; })
           .attr("y", 10)
           .style("font-family", "sans-serif")
           .style("font-size", "30px")
           .style("fill", "red");

      /* Commented out to replace with visualization
      for(word of results) {
        let str = '<li class="list-group-item"><strong>' + word + ':</strong> ' + (wordScores[word]).toFixed(2) + '<ul>';

        for(sr of Object.keys(cookedData)) {
            str += '<li>' + sr + ': ' + cookedData[sr].wordScores[word] + '</li>'
        }

        str += '</ul></li>';
        $("#word_list").append(str)
      }

      $("li > ul").hide()

      if(Object.keys(cookedData).length > 1) {
          $("#contribs").show();

          $("#contribs").click(function() {
                $("li > ul").toggle()
          });
      }
      */
  }
