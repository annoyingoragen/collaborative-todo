import { View, TextInput } from 'react-native'
import  { useState, useEffect, useRef } from 'react';
import Checkbox from '../Checkbox';

interface ToDoItemProps {
    todo: {
      id: string;
      content: string;
      isCompleted: boolean;

    },
    onSubmit: () => void
  }

const ToDoItem = ({todo,onSubmit}:ToDoItemProps) => {
    const [isChecked, setIsChecked] = useState(false)
    const [content, setContent] = useState('');

    // const [updateItem] = useMutation(UPDATE_TODO);
    const input = useRef(null);
    useEffect(()=>{
        if(!todo){return}
        setIsChecked(todo.isCompleted);
        setContent(todo.content);

    },[todo]);

    useEffect(() => {
        if (input.current) {
          input?.current?.focus();
        }
      }, [input])

    
  const onKeyPress = ({ nativeEvent  }) => {
    console.log(nativeEvent.key)
    console.log(content)
    if (nativeEvent.key === 'Backspace' && content === '') {
      // Delete item
      console.warn('Delete item');
    }
  }
  return (
    <View style={{flexDirection:'row' ,alignItems:'center',marginVertical:3}}>
        <Checkbox isChecked={isChecked} onPress={()=>{setIsChecked(!isChecked)}}/>
        <TextInput 
         ref={input}
         value={content}
         onChangeText={setContent}
        style={{
            flex:1,
            marginLeft:12,
            color:'white',
            fontSize:18,
        }}
        multiline
        // onEndEditing={callUpdateItem}
        onSubmitEditing={onSubmit}
        blurOnSubmit
        onKeyPress={onKeyPress}
        />
  </View>
  )
}

export default ToDoItem