<?php

<?php
$files = scandir('./code');
sort($files); // this does the sorting
foreach($files as $file){
   echo'<a href="/code/'.$file.'">'.$file.'</a>';
   echo'</br>';
}
?>

?>