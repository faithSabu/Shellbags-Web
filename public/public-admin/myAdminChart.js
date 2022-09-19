let barChart = document.getElementById('barChart').getContext('2d');

      let mmm = new Chart(barChart, {
        type: 'radar',
        data:{
          labels:['llkj','hsdk','sjflk','kjhdfs'],
          datasets:[{
            label:'lsd',
            data:[
            345,
            546,
            345,
            345,
            2543
            ],
            backgroundColor:['green','yellow']
          }]
        },
        options:{}
      })