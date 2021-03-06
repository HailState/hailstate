var xmlrpc = require("xmlrpc"),
    Q = require("q"),
    _ = require("lodash"),
    token = false;

var client = xmlrpc.createClient({ host: 'api.opensubtitles.org', port: 80, path: '/xml-rpc'});

function OpenSubtitles() {
    return;
}

OpenSubtitles.prototype.searchEpisode = function (data, userAgent) {
    return login(userAgent)
        .then(function(token) {
            data.token = token;
            return search(data);
        }).fail(function(error) {
            if (error === 'noResult') {
                // try another search method
                return search({
                    imdb_id: data.imdb_id.replace("tt", ""),
                    season: data.season,
                    episode: data.episode,
                    recheck: true,
                    token: data.token
                });
            }
        });
};

var login = function (userAgent) {
    var self = this;
    return Q.Promise(function(resolve, reject) {

        client.methodCall('LogIn', ['', '', 'en', userAgent], function (err, res) {
            if (err) {
                reject(err);
            }
            return resolve(res.token);
        });

    });
};

var search = function (data) {
    var self = this;
    var opts = {};
    opts.sublanguageid = "all";

    // Do a hash or filename check first (either), then fallback to imdb+season+episode
    if(data.hash) {
        opts.moviehash = hash;
    }
    if(!data.filename) {
        opts.imdbid = data.imdb_id.replace("tt", "");
        opts.season = data.season;
        opts.episode = data.episode;
    }
    else {
        opts.tag = data.filename;
    }

    return Q.Promise(function(resolve, reject) {

        client.methodCall('SearchSubtitles', [
            data.token,
            [
                opts
            ]
        ],
        function(err, res){

            if (err || res.data === false) {
                if (data.recheck !== true) {
                    return reject(err || 'noResult');
                }else {
                    return reject('Unable to extract subtitle');
                }
            }

            // build our output
            var subs = {};

            _.each(res.data, function(sub) {

                if(sub.SubFormat != "srt") {
                    return;
                }

                // episode check
                if(data.season && data.episode) {
                    if(parseInt(sub.SeriesIMDBParent, 10) != parseInt(data.imdb_id.replace("tt", ""), 10)) {
                        return;
                    }
                    if(sub.SeriesSeason != data.season) {
                        return;
                    }
                    if(sub.SeriesEpisode != data.episode) {
                        return;
                    }
                }

                var tmp = {};
                tmp.url = sub.SubDownloadLink.replace(".gz", ".srt");
                tmp.lang = sub.ISO639;
                tmp.downloads = sub.SubDownloadsCnt;
                tmp.score = 0;

                if(sub.MatchedBy == "moviehash") {
                    tmp.score += 100;
                }
                if(sub.MatchedBy == "tag") {
                    tmp.score += 50;
                }
                if(sub.UserRank == "trusted") {
                    tmp.score += 100;
                }
                if(!subs[tmp.lang]) {
                    subs[tmp.lang] = tmp;
                } else {
                    // If score is 0 or equal, sort by downloads
                    if(tmp.score > subs[tmp.lang].score || (tmp.score == subs[tmp.lang].score && tmp.downloads > subs[tmp.lang].score.downloads)) {
                        subs[tmp.lang] = tmp;
                    }
                }
            });

            return resolve(subs);

        });

    });
};

module.exports = new OpenSubtitles();
