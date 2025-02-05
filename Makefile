clean_all: 
	rm -rf node_modules && npm install
prebuild: 
	npx expo prebuild && cd ios/ && pod install && cd ../
start:
	npx expo start

rebuild: clean_all prebuild start