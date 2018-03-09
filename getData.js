var redditURL = "https://www.reddit.com/r/";
var defaultParams = "/new.json?limit=100";
//var str_ = "https://www.reddit.com/r/" + subreddit + "/new.json?limit=100"
var titles = [];

var ws_pattern = /\w+'*\w+/g

var data = []

function postData(post) {
    let id_ = post.data.id
    let title_ = post.data.title.toLowerCase()
    var content_ = post.data.selftext //need to clean content
    
    content_ = content_.toLowerCase()
    let score_ = post.data.score
    
    var wordScores_;

    if(content_) {
        words = content_.match(ws_pattern)
        
        if(words) {
            words = words.filter(word => !stop_words.has(word) && isNaN(word))
            
            let counts = words.reduce(function(p,c) {
                p[c] = (p[c] || 0) + 1;
                return p;
            }, {});

            let uWords = Object.keys(counts)
            let scorePerWord = score_ / uWords.length

            wordScores_ = uWords.map(function(x, i){return {"word": x, "score": counts[x] + 0.2* scorePerWord}})
        }
    }


    return {
        id: id_,
        title: title_,
        score: score_,
        content: content_,
        wordScores: wordScores_
    };
}

function callback(result) {
    //console.log(result)

    var posts = result.data.children
    
    for(post of posts) {
        titles.push(post.data.title)
        data.push(postData(post))
    }

    return result.data.after
}

function summarize() {
    console.log(data.length)

    var wordScoresByPost = data.map(post => post.wordScores);
    wordScoresByPost = wordScoresByPost.map(function(x) { if (x) return x; else return []; })
    var wordScores = new Map();
    
    wordScoresByPost.reduce((a, b) => a.concat(b)).map(
        function (word)  {
            if (wordScores[word.word]) wordScores[word.word] += word.score;
            else wordScores[word.word] = word.score;
        }
    )
    
    var topWords = Object.keys(wordScores);
    topWords.sort((a, b) => wordScores[b] - wordScores[a]);
    
    //topWords.slice(0, 10).map(word => console.log(word + ": " + wordScores[word]))
    let result = topWords.slice(0, 10)

    display(result,wordScores)
}

var total_iterations = 0
var max_iterations = 0
var maxListings = 5

function getPosts(str, next, i) {
    var url = str;

    if (next) url += "&after=" + next;

    $.getJSON(url, i, function(result) {
        let next_ = callback(result)
        
        //console.log(total_iterations)
        total_iterations++
        updateCount(total_iterations, max_iterations)
        i++

        if(total_iterations == max_iterations) { summarize() }
        else if (i < maxListings && next_) {
            getPosts(str, next_, i);
        }
    });
}