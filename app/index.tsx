import { StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'

const index = () => {
    const router = useRouter()

    setTimeout(() => {
        router.replace({
            pathname: '/open',
        });
    }, 0);

  return (
    <View style={{flex:1, alignItems: 'center', justifyContent: 'center'}}>
      <Text>Your Home Page</Text>
    </View>
  )
}

export default index

const styles = StyleSheet.create({})