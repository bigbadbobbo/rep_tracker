function hide()
{
  var button = document.getElementById("makeExerciseButton");
  button.classList.remove("visible")
  button.classList.add("not-visible")
}

function show()
{
  var button = document.getElementById("makeExerciseButton");
  button.classList.remove("not-visible")
  button.classList.add("visible")
}

document.getElementById("exercise").addEventListener("select", function() {
  selected = document.getElementById("exercise").selectedOptions;
  if(selected == "")
})
