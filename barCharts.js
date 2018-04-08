var prunedWords = [];
var frequentSets = [];
var palette = ['#1f78b4', '#66c2a5'];
// var palette = ['#66c2a5','#fc8d62'];
var pruned = d3.scaleOrdinal()
        .domain([false, true])
        .range([1.0, 0.3]);

function initFrequent(frequentSets) {
    frequentSetsChart = d3.select("#frequentSetsChart")
        .append("svg")
        .attr("id", "frequentSetsSvg")
        .attr("width", chartWidth)
        .attr("height", height);

    frequentSetsCanvas = frequentSetsChart.append("g")
        .attr("width", chartWidth)
        .attr("height", height + 50)
        .attr("id", "canvas2");

    displayFrequentSets(frequentSets);
}

function displayFrequentSets(frequentSets) {
    var width = chartWidth;
    var margin = { top: 20, right: 20, bottom: 30, left: 70 };
    var bandWidth = 50;
    var height = bandWidth * frequentSets.length;

    // frequentSets = argSets;
    // console.log(frequentSets)

    frequentSets = frequentSets.map(function (d) { 
        return { 
            candidate: d.candidate.reduce((a, b) => String(a) + ', ' + String(b)),
            frequency: d.frequency
        };
    }).sort((a, b) => a.frequency - b.frequency);

    var xUpperBound = d3.max(frequentSets, d => d.frequency);

    //Scale definition
    var x = d3.scaleLinear()
        .domain([0, xUpperBound])
        .range([0, width]);
    var y = d3.scaleBand()
        .domain(frequentSets.map(d => d.candidate))
        .padding(0.1)
        .range([height, 0]);

    var color = d3.scaleSequential(d3.interpolateYlGnBu)
        .domain([0, d3.max(frequentSets.map(d => d.frequency))]);

    var textCutoff = d3.max(frequentSets.map(d => d.frequency)) / 2;
    // console.log(textCutoff)

    

    var barSelection = frequentSetsCanvas.selectAll(".bar")
        .data(frequentSets, d => d.candidate);

    // ENTER
        
    var bars = barSelection.enter()
            .append("g")
            .attr("class", "bar")
            .style("opacity", 0.0);

    bars.append("rect")
        .attr("class", "context-bar")
        .attr("x", 0)
        .attr("y", d => y(d.candidate))
        .attr("width", width)
        .attr("height", y.bandwidth())
        .style("z-index", -1);

    bars.append("rect")
        .attr("class", "frequency-bar")
        .attr("x", 0)
        .attr("y", d => y(d.candidate))
        .attr("height", d => y.bandwidth())
        .attr("width", d => x(d.frequency))
        .style("fill", d => color(d.frequency))
        .style("opacity", 0.7)
        .on("mouseover", hoverGradientBar)
        .on("mouseout", hideTooltip);

    bars.append("text")
        .text(d => "Frequency: " + d.frequency)
        .attr("class", "frequency-text")
        .attr("x", d => 5)
        .attr("y", d => y(d.candidate) + (y.bandwidth() - 5))
        .style("font-family", "sans-serif")
        .style("font-size", "10px")
        .style("fill", d => (d.frequency > textCutoff) ? "white" : "black")
        .style("z-index", 1);

    bars.append("text")
        .text(d => d.candidate)
        .attr("class", "candidate-text")
        .attr("x", 5)
        .attr("y", d => y(d.candidate) + 20)
        .style("font-family", "sans-serif")
        .style("font-size", "17px")
        .style("fill", d => (d.frequency > textCutoff) ? "white" : "black")
        .style("z-index", 1);

    bars.transition()
            .duration(500)
            .style("opacity", 1.0);


    // UPDATE

    var barUpdate = bars.merge(barSelection)
        .transition()
            .duration(750)
            .ease(d3.easePoly.exponent(4))
            .style("opacity", 1.0);
            // .attr("width", d => x(d.frequency));

    barUpdate.selectAll("rect")
        .attr("y", d => y(d.candidate));
    
    barUpdate.select(".frequency-bar")
        .attr("width", d => x(d.frequency))
        .attrTween("fill", d => d3.interpolateRgb())
        .style("fill", d => color(d.frequency));
    
    barUpdate.select(".frequency-text")
        .text(d => "Frequency: " + d.frequency)
        .style("fill", d => (d.frequency > textCutoff) ? "white" : "black")
        .attr("y", d => y(d.candidate) + (y.bandwidth() - 5));

    barUpdate.select(".candidate-text")
        .style("fill", d => (d.frequency > textCutoff) ? "white" : "black")
        .attr("y", d => y(d.candidate) + 20);

    // EXIT

    barSelection.exit()
        .transition()
            .duration(500)
            .style("opacity", 0.0)
            .remove();

    // barExit.remove();
}

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
    console.log(chartWidth)
    var width = chartWidth;
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

    var bar = canvas
        .selectAll(".bar")
        .data(topWords)
        .enter()
        .append("g")
            .attr("class", "item")
            .style("opacity", 0.0)
          .on("click", removeWord);

    // gray background for context
    console.log(topWords[0])
    bar.append("rect")
        .attr("class", "context-bar")
        .attr("x", 0)
        .attr("y", d => y(d.word))
        .attr("width", width)
        .attr("height", y.bandwidth())
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
        .text(d => x(d.value) > 100.0 ? "Total score: " + d.value.toFixed(0) : d.value.toFixed(0))
        .attr("x", d => 5)
        .attr("y", d => y(d.word) + (y.bandwidth() - 5))
        .attr("class", "topWordText")
        .style("text-decoration", d => (d.pruned) ? "italics line-through" : "none")

    bar.append("text")
        .text(d => d.word)
        .attr("x", 5)
        .attr("y", d => y(d.word) + 20)
        .attr("class", "topWordText")
        .style("font-size", "17px")
        .style("text-decoration", d => (d.pruned) ? "italics line-through" : "none");

    bar.transition()
            .duration(500)
            .style("opacity", 1.0);

    // bar.exit().remove();
}