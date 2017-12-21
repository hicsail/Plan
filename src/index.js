const Airtable = require('airtable')
const Mustache = require('mustache')
const url = window.location.href.split('?')[1].split('/')
const ProjectID = url.pop()
Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: url.pop()
})

let projectTemplate = '<h1 class="subtitle">Project Requirements for: <span class="has-text-{{Color.css-class}}"><b>{{Full Name}}</b></span></h1>'
let taskTemplate = `{{#Tasks}}
    <br><div class="box">
    <nav class="level">
        <div class="level-left">
            <div class="level-item">
                <h2>{{createdAt}}</h2>
            </div>
            <div class="level-item">
                <h2><b>{{Title}}</b></h2>
            </div>
        </div>
        {{#Status}}
        <div class="level-right">
            <div class="tags has-addons">
                <span class="tag is-medium"><i class="{{Status.font-awesome-class}}"></i></span>
                <span class="tag is-medium is-{{Status.color.css-class}}">{{Status.Name}}</span>
            </div>
        </div>
        {{/Status}}
    </nav>
    {{#Description}}
    <p>
        {{.}}
    </p>
    {{/Description}}
    {{#LastUpdate}}
        <hr>
        Last Update: {{LastUpdate}}
    {{/LastUpdate}}
    {{#HasHistory}}
      <hr>
      <b>History</b>
      {{#History}}
      <p>
          {{.}}
      </p>
      {{/History}}
    {{/HasHistory}}
</div>{{/Tasks}}`

const Base = Airtable.base('appSge6nAAASfzGN5')
getData(Base).then(data => {
  for(let i = 0; i < data['Tasks'].length; i++) {
    if(data['Tasks'][i]['Description']) data['Tasks'][i]['Description'] = data['Tasks'][i]['Description'].split('\n')
    if(data['Tasks'][i]['History']) {
      data['Tasks'][i]['History'] = data['Tasks'][i]['History'].split('\n')
      data['Tasks'][i]['HasHistory'] = true
    }
  }
  document.getElementById('Project').innerHTML = Mustache.render(projectTemplate,data)
  document.getElementById('Cards').innerHTML = Mustache.render(taskTemplate,data)
})


function getData(Base) {
  return new Promise((resolve, reject) => {
    let promeses = [
      getTable(Base,'Projects'),
      getTable(Base,'Tasks'),
      getTable(Base,'Statues'),
      getTable(Base,'Color')
    ]

    Promise.all(promeses).then(data => {
      const Projects = data[0]
      const Tasks = data[1]
      const Statues = data[2]
      const Colors = data[3]
      let project;
      for(let id in Projects) {
        if(Projects[id]['Project Name'] == ProjectID) {
          project = Projects[id]
        }
      }
      project['Color'] = Colors[project['Color'][0]]
      for(let i = 0; i < project['Tasks'].length; i++) {
        project['Tasks'][i] = Tasks[project['Tasks'][i]]
        if(Statues[project['Tasks'][i]['Status']]){
          project['Tasks'][i]['Status'] =  Statues[project['Tasks'][i]['Status'][0]]
          if(project['Tasks'][i]['Status']['color'][0]) {
            project['Tasks'][i]['Status']['color'] = Colors[project['Tasks'][i]['Status']['color'][0]]
          }
        } else {
          project['Tasks'][i]['Status'] = null
        }
      }
      return resolve(project)
    }).catch((err) => {
      reject(err)
    })
  })
}

function getTable(Base, tableName) {
  return new Promise((resolve, reject) => {
    let rows = {}
    Base(tableName).select({
      maxRecords: 25,
      view: 'Grid view'
    }).eachPage(function page(records, fetchNextPage) {
      records.forEach(function(record) {
        rows[record['id']] = record._rawJson.fields
        rows[record['id']]['createdAt'] = new Date(record._rawJson.createdTime).toLocaleDateString()
      })
      fetchNextPage()

    }, function done(err) {
      if (err) {
        return reject(err)
      }
      resolve(rows)
    })
  })
}