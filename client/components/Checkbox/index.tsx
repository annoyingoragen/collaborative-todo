import { View, Pressable } from 'react-native'
import React from 'react'
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface CheckboxProps{
    isChecked:boolean,
    onPress:()=>void
}
const Checkbox = (props:CheckboxProps) => {
    const name=props.isChecked? 'checkbox-marked-outline':'checkbox-blank-outline'
  return (
    <Pressable onPress={props.onPress}>
        
        <MaterialCommunityIcons name={name} size={24} color='black' />
        
    
    </Pressable>
  )
}

export default Checkbox