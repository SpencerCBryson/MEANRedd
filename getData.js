var redditURL = "https://www.reddit.com/r/";
var newParams = "/new.json?limit=100";
var topParams = "/top.json?limit=100&t=";
//var str_ = "https://www.reddit.com/r/" + subreddit + "/new.json?limit=100"
//var titles = [];

var ws_pattern = /\w+'*\w+/g

var data = {}
var cookedData = {}
var finished = {}
var subredditCount = 0

var total_iterations = 0
var max_iterations = 0
var maxListings = 10;
var maxPosts = 5;

function postData(post) {
    let id_ = post.data.id
    let title_ = post.data.title.toLowerCase()
    var content_ = post.data.selftext
    let score_ = post.data.score
    let reddit_ = post.data.subreddit
    var wordScores_, words = null
    
    content_ = content_.toLowerCase()
    
    if(content_) {
        //if the post contains a block of post content
        wordsArr = content_.replace(/[,./?!()*]/g, '').split(' ')
        words = wordsArr.filter(word => !word.match(/[^a-zA-Z]/g))
    }
    else if (title_) {
        //if the post has no text content (i.e. a link or video)
        //will have to base the score on the title
        wordsArr = title_.replace(/[,./?!()*]/g, '').split(' ')
        words = wordsArr.filter(word => !word.match(/[^a-zA-Z]/g))
    }

    words = words.filter(word => !stop_words.has(word) && isNaN(word))
    
    let counts = words.reduce(function(p,c) {
        p[c] = (p[c] || 0) + 1;
        
        // for pattern analysis
        globalWordCounts[c] = (globalWordCounts[c] || 0) + 1;
        return p;
    }, {});

    let uWords = Object.keys(counts)
    let scorePerWord = score_ / uWords.length
    
    //Scoring functions need to be re-evaluated

    if(content_)
        wordScores_ = uWords.map(function(x, i){return {"word": x, "score": (counts[x] * 1.2) + (0.3 * scorePerWord)}})
    else if (title_)
        wordScores_ = uWords.map(function(x, i){return {"word": x, "score": (counts[x] * 1.2) + (0.03 * scorePerWord)}})

    return {
        id: id_,
        title: title_,
        score: score_,
        content: content_,
        words: words,
        reddit: reddit_,
        wordScores: wordScores_,
        wordCounts: counts,
    };
}

function addData(result, subreddit) {
    //console.log(result)

    var posts = result.data.children
    
    if(!data[subreddit])
        data[subreddit] = []
    
    for(post of posts)
        data[subreddit].push(postData(post))

    return result.data.after
}

function summarizeSubReddit(subreddit, iter) {
    let sr_data = data[subreddit];
        
    var wordScoresByPost = sr_data.map(post => post.wordScores);
    wordScoresByPost = wordScoresByPost.map(function(x) {
        if (x) return x; else return []; 
    })
    
    var wordScores = {}
    
    wordScoresByPost.reduce((a, b) => a.concat(b)).map(
        function (word)  {
            if (wordScores[word.word]) 
                wordScores[word.word] += word.score;
            else 
                wordScores[word.word] = word.score;
        }
    )
    

    let wordData = {}
    
    wordData["wordScores"] = wordScores;
    //wordData["wordCounts"] = wordCounts;
    
    cookedData[subreddit] = wordData
    
}

function summarize() {        
    let subreddits = Object.keys(data)
    let finisedSubreddits = Object.keys(finished)
    
//    console.log(subreddits.length)
    
    if(finisedSubreddits.length != subredditCount)
        return
    else 
        subreddits.map(sr => console.log(sr + " : " + data[sr].length))
    
    var combined = {
        wordScores : {},
        wordCounts : {}
    }
    
    for(sr of subreddits) {
        let wordScores = cookedData[sr].wordScores
        
        Object.keys(cookedData[sr].wordScores).forEach(function(word) {
            if(combined.wordScores[word])
                combined.wordScores[word] += wordScores[word]
            else
                combined.wordScores[word] = wordScores[word]
        });
    }

    
    //cookedData["combinedData"] = combined;
    
    var words = Object.keys(combined.wordScores);
    let result = words.sort((a, b) => combined.wordScores[b] - combined.wordScores[a]);
    
    console.log('done')
    
    topWordRankings = result.slice(0, 30);
    
    display(topWordRankings, cookedData, combined);
    
    generateCandidatePairs();
    
}

var parsedComments = 0;

function parseComments(data, subreddit, post) {
    var rootComments = data[1].data.children;
    var wordScores = cookedData[subreddit].wordScores;
    
    for (comment of rootComments) {
        var content_ = comment.data.body;
        var score_ = comment.data.score;
        
        if(content_) {
            content_ = content_.toLowerCase()
            //if the comment contains a body
            wordsArr = content_.replace(/[,./?!()*]/g, '').split(' ')
            words = wordsArr.filter(word => !word.match(/[^a-zA-Z]/g))
            
//            if (content_.match("assaulting")) console.log(content_ + " " + comment.data.id)
            
            words = words.filter(word => !stop_words.has(word) && isNaN(word))

            let counts = words.reduce(function(p,c) {
                p[c] = (p[c] || 0) + 1;
                
                // for pattern analysis
                globalWordCounts[c] = (globalWordCounts[c] || 0) + 1;
                return p;
            }, {});

            let uWords = Object.keys(counts)
            let scorePerWord = score_ / uWords.length

            if(content_)
                wordScores_ = uWords.map(function(x, i){return {"word": x, "score": counts[x] + 0.2 * scorePerWord}})

            for (ws of wordScores_) {
                var word = ws.word;
                var score = ws.score;
                
                if (cookedData[subreddit].wordScores[word])
                    cookedData[subreddit].wordScores[word] += score;
                else
                    cookedData[subreddit].wordScores[word] = score;
            }
            
            post.content = [...post.content, ...words];
        }
    }  
}


function getComments(subreddit, post) {
    var url = redditURL + subreddit + "/comments/" + post.id + ".json";
    
//    if ($("#includeComments").prop('checked', false)) return;
    
    $.getJSON(url, function(data) {
        parseComments(data, subreddit, post);
        parsedComments++
        
//        console.log(parsedComments + " " + max_iterations)
        total_iterations++
        updateCount(total_iterations, max_iterations,1)
        
        if (parsedComments == max_iterations)
            summarize();
    });
}

var listingCount = 0;
var maxListingCount;

function getPosts(subreddit, params, next, i) {
    var url = redditURL + subreddit + params;
    
    if (next) url += "&after=" + next;
    
    listingCount++;
    
    if (total_iterations == 0 && max_iterations == 0)
        updateCount(listingCount, maxListingCount,0)
    else
        updateCount(total_iterations, max_iterations,0)

    $.getJSON(url, i, function(result) {
        //console.log(result)
        
        //append data to our list and fetch the
        // ID of the next listing
        let next_ = addData(result,subreddit)
        
        //increase counters to keep track of our progress
        
        i++
        
        
        //display scraping progress to user
        

        if (i < maxListings && next_) 
            //keep fetching posts if there is more
            getPosts(subreddit, params, next_, i);
        else {
            
            finished[subreddit] = true;
            summarizeSubReddit(subreddit, total_iterations);
            
//             updateCount(total_iterations, max_iterations)
            
            if (!$("#includeComments:checked").length){
                total_iterations++
                summarize();
            } else {
                var posts = data[subreddit];
                
                console.log("fetching " + posts.length + " posts");
                
                max_iterations += posts.length;
                for (p of posts) getComments(subreddit, p)
            }
        }
    });
}