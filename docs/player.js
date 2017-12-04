// Runner grade of 2017
var GRADE = {
          M: [  ['0:00', '3:39'],  // diamond
                ['3:40', '3:55'],  // platium
                ['3:56', '4:05'],  // gold
                ['4:06', '4:18'],  // silver
                ['4:19', '4:41'],  // bronze
                ['4:42', '5:06'],  // steel
                ['5:07', '5:31'],  // aluminium
                ['5:32', 'MAX'],  // out of grade
               ],
          F: [  ['0:00', '4:25'],  // diamond
                ['4:26', '4:42'],  // platium
                ['4:43', '4:51'],  // gold
                ['4:52', '5:05'],  // silver
                ['5:06', '5:29'],  // bronze
                ['5:30', '5:56'],  // steel
                ['5:57', '6:22'],  // aluminium
                ['5:23', 'MAX'],  // out of grade
               ],
        };
// color assigned for each grade
var GRADE_COLOR = [
              '#00FFFF', // diamond
              '#FFFFFF', // platium
              '#FFFF00', // gold
              '#7FFF00', // silver
              '#008B8B', // bronze
              '#D2691E', // steel
              '#C71585', // aluminum
              '#FF0000', // out of grade   
          ];

// maximum time when all team finishing 
var MAX = to_seconds('4:30:00'); 
// wait for miliseconds before next member
var WAIT = 500;

// count of members for each team
var COUNT_OF_MEMBERS = 5;

// convert elapsed time in second to "HH:MM:SS"
function to_time(seconds) {
  if (!Number.isNaN(seconds)) {
    var dt = new Date(null);
    dt.setSeconds(seconds); 
    return dt.toISOString().substr(11, 8);
  } else {
    return '--:--:--';
  }
}

// convert elapsed time or pace in "HH:MM:SS" format to timve value in second
function to_seconds(t) {
  return t.split(':').reduce((p,c) => p * 60 + +c, 0); 
}

// return MAX if not a number
function mx(v) {
  return Number.isNaN(v) ? MAX : v;  
}

// given a gender & pace, return his/her grade
function gradeOf(gender, pace) {
  var i, arr = GRADE[gender + '_tv'];  // tv: time value in seconds
  if (!arr) {
    return -1;
  }
  for (i = 0; i < arr.length; i++) {
    if (pace < arr[i][1]) {
      return i;
    }
  }
  return i - 1;
}

// prepare data:
//  - calculate time in second cosumed by each member (a step)
//  - convert adjusted pace in "MM:SS" format to time value in seconds
//  - calculate time in second elapsed upto member N (total time elapsed)
//  - convert adjusted pace to grade according to a member's gender
//  - interpolate distance covered by interval of 10-minute
function process(arr) {
  console.log('pre-process');
  for (var k in GRADE) {
    GRADE[k+ '_tv'] = GRADE[k].map(p=> p.map(v => to_seconds(v)));
  }
  arr.forEach(d => {
    d._step = d.members.map(m => to_seconds(m.duration));
    d._pace = d.members.map(m => to_seconds(m['adjusted-pace']));
    d._total = d._step.reduce((p,c, i) => (p.push( c + (p[i - 1] || 0) ), p), []);
    d._grade = d._pace.map((p, i) => gradeOf(d.members[i].gender, p));
    
    d._distance = interpolateDistance(d);
  });
}

//  interpolate distance covered by interval of 10-minute
var INTERVAL = 600;  // 600 seconds = 10 minute

function interpolateDistance(d) {
// noprotect
  var t = gap = INTERVAL, arr = [], idx = 0,  l = 0,  g1, last, goal;
  for (t = gap; t <= MAX && idx < COUNT_OF_MEMBERS; t += gap) {
    if (t <= d._total[idx]) {
      l += (gap / d._pace[idx]) || 0;
    } else {
      g1 = t - d._total[idx];
      if (g1 < gap || idx < COUNT_OF_MEMBERS - 1) {
        l += ((g1 / d._pace[idx + 1]) || 0) + (((gap - g1) / d._pace[idx]) || 0);  
        if (idx < COUNT_OF_MEMBERS - 1) {
          idx++;
        }
      } else if (goal) {
         l = 42.195;
      } else {
         l += gap / d._pace[idx];
        if (idx >= COUNT_OF_MEMBERS - 1) {
          goal = true;
        }
      }
    }
    arr.push(l);
  }
  return arr;
}

// color for gender (Male/Female/Unknown)
var GENDER_COLOR = {
  '':  '#444',
  'F': '#F00',
  'M': '#44F',
}

// callback after receive data
function receiveData(records) {
  var arr = records.slice();
  process(arr);
  
  var upto = 0, bar;
  var scale = (svgTeams.node().getBoundingClientRect().width - 40) / MAX;

  d3.select('.legend').selectAll('div')
      .data(GRADE_COLOR)
      .enter()
      .append('div')
      .attr('style', (d, i) => 'background-color:' + d);
            
  function _init() {
    arr = records.slice();
    bar = svgTeams.selectAll('g')
                        .data(arr, key)
                        .enter()
                        .append('g')
                           .attr('transform', (d,i) => 'translate(0, ' + (i * 28 + 20) + ')');

      bar.selectAll('rect')
           .data(d => d.members)
           .enter()
           .append('rect')
           .classed('member', true)
           .attr('x', (d, i) => 5 + i * 5)
           .attr('y', 4)
           .attr('height', 7)
           .attr('width',  4)
           .attr('fill', d => GENDER_COLOR[d.gender || '']);

    bar.append('text')
            .attr('class', 'name')
            .attr('x', d => 36)
            .attr('y', 0)
            .text(d => 'T' + d.no + '.' + d.name);

    bar.append('text')
            .attr('class', 'result')
            .attr('x', d => 280)
            .attr('y', 0);

    var rank = bar.insert('g', ':first-child')
            .attr('class', 'rank')
            .classed('marked', d => +d.no === markedNo)
            .attr('transform', 'translate(0, -15)')
            .on('click', pinMe);
    
    rank.append('rect')
             .attr('width', 33)
             .attr('height', 27)
             .attr('rx', 3)
             .attr('ry', 3);
    rank.append('text')
             .attr('x', 4)
             .attr('y', 15)
             .text((d, i) => (' ' + ++i + '.').slice(-3));

    stepByStep || setTimeout( () => run(arr, bar, upto, scale), 500);
    if (upto === -1) {
      upto = 0;
    }
  }

  _init();
  
  function playOrStepby() {
    d3.event.stopPropagation();
    var sel = d3.select(this);
    if (!stepByStep) {
      if (sel.classed('btn-stepby')) {
        stepByStep = true;
        timers.forEach(v => clearTimeout(v));
        upto = g_upto + 0;
        timers = [];
      }
    } else {
      if (sel.classed('btn-play')) {
        upto = -1;
        stepByStep = false;
      }      
    }
    if (upto >= COUNT_OF_MEMBERS) {
      upto = -1;
    }
    if (!stepByStep || upto === -1) {
      svgTeams.html('');
      bar = svgTeams.selectAll('g').data(arr, key);
      bar.interrupt();
      bar.select('g').interrupt();
      bar.select('rect').interrupt();
      bar.select('.result').interrupt();
      bar.select('.rank').interrupt();
      _init();
      showMarked.call(svgTeams.node());
      upto = 0;
    } else {
      if (upto === -1) {
        _init();
        upto++;
      } else {
        var next = upto;
        setTimeout( () => run(arr, bar, next, scale), 500);
        if (upto >= COUNT_OF_MEMBERS - 1) {
          upto = -1;
        } else {
          upto++;
        }
      }
    }
  }
  
  d3.select('.btn-play').on('click', playOrStepby);
  d3.select('.btn-stepby').on('click', playOrStepby);
  
  d3.select('.fixed').on('click', function() {
    d3.select('#infographics-container').node().parentNode.scrollTop = 0;
  });
  
}

function pinMe() {
    var sel = d3.select(this);
    if (sel.classed('marked')) {
      sel.classed('marked', false);
      markedNo = -1;
    } else {
      d3.selectAll('.rank').classed('marked', false);
      sel.classed('marked', true);
      markedNo = +d3.select(this.parentNode).datum().no;
    }
}

function showMarked() {
  var marked = d3.select(this).select('.rank.marked').node();
  if (marked != null) {
    var scroller = container.node().parentNode, 
        top = d3.select('.fixed').node().getBoundingClientRect(),
        r   = marked.getBoundingClientRect(),
        p   = r.top - top.height;
    
    if (p < 0) {
      scroller.scrollTop += p;
    } else {
      p = scroller.clientHeight - r.top - r.height;
      if (p < 0) {
        scroller.scrollTop -= p;
      }
    }
  } 
}

// return key of record = team no.
function key(d) {
  return d.no;
}

var stepByStep = false;
var timers = [];

// run upto member N
// arr : array of records
// bar: selection of all bars
// upto: member index (0 to 4)
// scale: convert time value in second to width of bar
function run(arr, bar, upto, scale) {
    arr.sort((a, b)=> mx(a._total[upto]) -  mx(b._total[upto]));
    var factor = upto > 0 ? 6 : 3; // factor = 12;
    var func = {
      step: d => d._step[upto] / factor,
      gap:  d => (upto === 0 ? 0 : d._total[upto - 1] - fastest)
    };
  
    var fastest = arr.reduce( (p, c) => ((c = upto === 0 ? 0 : c._total[upto - 1]) < p ? c: p), Number.MAX_SAFE_INTEGER);
    var max = arr.reduce( (p, c) => (c =c._step[upto]) > p ? c : p, 0);

    max += arr.reduce((p, c) => {
      c = func.gap(c) * factor;
      return c > p ? c: p;
    }, 0);
    max /= factor;
  
  
    bar = svgTeams.selectAll('g').data(arr, key);
    bar.transition()
         .delay(max)
         .duration(400)
         .attr('transform', (d,i) => 'translate(0, ' + (i * 28 + 20) + ')')
         .on('end', showMarked);
    
    svgTeams.selectAll('.rank').on('click', pinMe);
  
    bar.append('rect')
         .classed('f', d => d.members[upto].gender === 'F')
         .attr('x', d => 36 + upto * 2 + (d._total[upto - 1 ] || 0) * scale)
         .attr('y', 4)
         .attr('height', 7)
         .attr('width',  0)
         .attr('fill', d => GRADE_COLOR[d._grade[upto]])// step_color(upto))
         .transition()
         .delay(func.gap)
         .duration(func.step)
         .ease(d3.easeLinear)
         .attr("width", d => (d._step[upto] || 0) * scale);
  
    bar.select('.result')
         .attr('fill', '#38F')
         .transition()
         .delay(func.gap)
         .text(d => to_time(d._total[upto]))
         .filter(d => !Number.isNaN(d._total[upto]))
         .attr('fill', '#FFF')
         .transition()
         .duration(250)
         .attr('fill', '#38F')
      
    bar.select('.rank').select('text')
         .transition()
         .delay(max)
         .duration(400)
         .text((d, i) => (' ' + ++i + '.').slice(-3));

     if (upto < COUNT_OF_MEMBERS - 1) {
       
       if (timers[upto]) {
         clearTimeout(timers[upto]);
       }
       if (!stepByStep) {
         timers[upto+1] = setTimeout(() => run(arr, bar, upto+1, scale),  stepByStep ? 0 : max + WAIT);
       }
       clearTimeout(timers[upto]);
       if (upto + 1 > g_upto) {
         g_upto = upto + 1;
       }
     } else {
       g_upto = -1;
     } 
}

var container = d3.select("#infographics-container"),
    svgTeams  = d3.select('#svg-teams'),
    markedNo  = -1,
    g_upto    = -1;

d3.json('data.json', receiveData);
